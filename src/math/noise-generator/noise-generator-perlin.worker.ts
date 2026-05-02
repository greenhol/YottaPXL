import { GridWithMargin } from '../../grid/grid-with-margin';
import { MessageFromWorker, MessageToWorker } from '../../worker/types';
import { WorkerSetupPerlinNoise } from './worker-setup-perlin-noise';

const PROGRESS_INTERVAL = 0.05;
const MIN_PIXELS_PER_CELL = 2;

self.onmessage = (e) => {
    let timeStamp = Date.now();
    const { type, data }: { type: MessageToWorker, data: WorkerSetupPerlinNoise; } = e.data;
    if (type === MessageToWorker.START) {
        const grid = GridWithMargin.copyWithMargin(data.gridBlueprint);
        let result: Float32Array = calculate(grid, data.scaleFactor);
        console.info(`#NoiseGeneratorPerlin (worker) - calculation done in ${(Date.now() - timeStamp) / 1000}s`);
        self.postMessage({ type: MessageFromWorker.RESULT, result }, [result.buffer]);
    }
};

function calculate(grid: GridWithMargin, scaleFactor: number): Float32Array {
    const data = new Float32Array(grid.size);
    const clampedScaleFactor = clampScaleFactor(scaleFactor, grid);
    const { gradients, gridCols, gridRows, x0, y0 } = buildGradientGrid(
        grid.range.xMin.toNumber(),
        grid.range.xMax.toNumber(),
        grid.yMin.toNumber(),
        grid.yMax.toNumber(),
        clampedScaleFactor,
    );

    // Track raw min/max for normalisation to [0, 1]
    let rawMin = Infinity;
    let rawMax = -Infinity;

    // --- Pass 1: compute raw Perlin values ---
    let nextProgressThreshold = PROGRESS_INTERVAL;

    for (let row = 0; row < grid.height; row++) {
        for (let col = 0; col < grid.width; col++) {
            const [mx, my] = grid.pixelToMath(col, row);
            const value = perlinSample(mx, my, gradients, gridCols, gridRows, x0, y0, clampedScaleFactor);

            const idx = grid.getIndex(col, row);
            data[idx] = value;

            if (value < rawMin) rawMin = value;
            if (value > rawMax) rawMax = value;
        }

        // Progress updates cover 0–90% during pass 1
        const progress = ((row + 1) / grid.height) * 0.9;
        if (progress >= nextProgressThreshold) {
            self.postMessage({ type: MessageFromWorker.UPDATE, progress: Math.round(progress * 100) });
            nextProgressThreshold += PROGRESS_INTERVAL;
        }
    }

    // --- Pass 2: normalise to [0, 1] ---
    const range = rawMax - rawMin || 1; // guard against flat noise
    for (let i = 0; i < data.length; i++) {
        data[i] = (data[i] - rawMin) / range;
    }

    // Final progress update — posted here after both passes are complete,
    // just before handing back to the caller who will post RESULT
    self.postMessage({ type: MessageFromWorker.UPDATE, progress: 100 });

    return data;
}

/**
 * Returns a raw Perlin noise value in approximately [-1, 1] for the math-space point (mx, my).
 */
function perlinSample(
    mx: number,
    my: number,
    gradients: Float32Array,
    gridCols: number,
    gridRows: number,
    x0: number,
    y0: number,
    scaleFactor: number,
): number {
    // Local coordinates within the grid (in grid-cell units)
    const gx = (mx - x0) / scaleFactor;
    const gy = (my - y0) / scaleFactor;

    // Grid cell corner indices
    const gc0 = Math.floor(gx);
    const gr0 = Math.floor(gy);
    const gc1 = gc0 + 1;
    const gr1 = gr0 + 1;

    // Clamp to valid grid range (handles boundary pixels)
    const c0 = Math.min(gc0, gridCols - 1);
    const c1 = Math.min(gc1, gridCols - 1);
    const r0 = Math.min(gr0, gridRows - 1);
    const r1 = Math.min(gr1, gridRows - 1);

    // Offsets from each corner to the sample point
    const dx0 = gx - gc0;
    const dy0 = gy - gr0;
    const dx1 = gx - gc1;
    const dy1 = gy - gr1;

    // Dot products at the four corners
    const n00 = dotGrad(c0, r0, dx0, dy0, gradients, gridCols);
    const n10 = dotGrad(c1, r0, dx1, dy0, gradients, gridCols);
    const n01 = dotGrad(c0, r1, dx0, dy1, gradients, gridCols);
    const n11 = dotGrad(c1, r1, dx1, dy1, gradients, gridCols);

    // Fade the local offsets
    const fu = fade(dx0);
    const fv = fade(dy0);

    // Bilinear interpolation: X first, then Y
    const x1 = lerp(n00, n10, fu);
    const x2 = lerp(n01, n11, fu);
    return lerp(x1, x2, fv);
}

/**
 * Generates a flat Float32Array of gradient unit vectors, interleaved as
 * [x0, y0, x1, y1, ...] in row-major order (gridCols × gridRows vectors).
 *
 * Grid points are anchored at the origin (0, 0) and spaced `scaleFactor`
 * apart in both axes, then extended to cover [xMin, xMax] × [yMin, yMax].
 */
function buildGradientGrid(
    xMin: number,
    xMax: number,
    yMin: number,
    yMax: number,
    scaleFactor: number,
): {
    gradients: Float32Array;
    gridCols: number;
    gridRows: number;
    x0: number;
    y0: number;
} {
    const x0 = Math.floor(xMin / scaleFactor) * scaleFactor;
    const y0 = Math.floor(yMin / scaleFactor) * scaleFactor;

    const gridCols = Math.ceil((xMax - x0) / scaleFactor) + 1;
    const gridRows = Math.ceil((yMax - y0) / scaleFactor) + 1;

    const gradients = new Float32Array(gridCols * gridRows * 2); // x,y interleaved

    for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
            const angle = Math.random() * 2 * Math.PI;
            const i = (r * gridCols + c) * 2;
            gradients[i] = Math.cos(angle); // x
            gradients[i + 1] = Math.sin(angle); // y
        }
    }

    return { gradients, gridCols, gridRows, x0, y0 };
}

/**
 * Returns the number of pixels that correspond to one math-space unit along
 * the x-axis. To be extracted to GridWithMargin later.
 */
function pixelsPerMathUnit(grid: GridWithMargin): number {
    return grid.width / (grid.range.xMax.toNumber() - grid.range.xMin.toNumber());
}

/**
 * Ensures the scale factor produces grid cells of at least MIN_PIXELS_PER_CELL.
 * Clamps upward (coarser grid) and logs a warning if the input value was too small.
 */
function clampScaleFactor(scaleFactor: number, grid: GridWithMargin): number {
    const minScaleFactor = MIN_PIXELS_PER_CELL / pixelsPerMathUnit(grid);
    if (scaleFactor < minScaleFactor) {
        console.warn(`#NoiseGeneratorPerlin (worker) - scaleFactor ${scaleFactor} produces fewer than ${MIN_PIXELS_PER_CELL} pixels per cell. Clamping to ${minScaleFactor.toFixed(4)}.`);
        return minScaleFactor;
    }
    return scaleFactor;
}

/** Quintic fade curve — smooth first and second derivatives. */
function fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
}

/** Linear interpolation. */
function lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
}

/**
 * Dot product of the gradient at grid corner (gc, gr) with the offset
 * vector from that corner to the sample point (dx, dy).
 * Gradients are stored interleaved: x at 2*i, y at 2*i+1.
 */
function dotGrad(
    gc: number,
    gr: number,
    dx: number,
    dy: number,
    gradients: Float32Array,
    gridCols: number,
): number {
    const i = (gr * gridCols + gc) * 2;
    return gradients[i] * dx + gradients[i + 1] * dy;
}
