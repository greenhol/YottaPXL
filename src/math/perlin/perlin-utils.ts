import { XoRng } from '../../../shared/xo-rng';
import { GridWithMargin } from '../../grid/grid-with-margin';

export const MIN_PIXELS_PER_CELL = 2;

export interface GradientGrid {
    gradients: Float32Array;
    gridCols: number;
    gridRows: number;
    x0: number;
    y0: number;
}

export interface PerlinLayer {
    grid: GradientGrid;
    amplitude: number;
    scaleFactor: number; // effective scale factor for this layer
}

/**
 * Computes the grid cell indices, corner offsets and faded weights for a
 * math-space sample point. This is the shared setup logic used by both
 * perlinScalarSample and perlinGradientSample.
 */
export interface CellSetup {
    c0: number;
    c1: number;
    r0: number;
    r1: number;
    dx0: number;
    dy0: number;
    dx1: number;
    dy1: number;
    fu: number;
    fv: number;
}


/**
 * Ensures the scale factor produces grid cells of at least MIN_PIXELS_PER_CELL.
 * Clamps upward (coarser grid) and logs a warning if the input value was too small.
 */
export function clampScaleFactor(scaleFactor: number, grid: GridWithMargin): number {
    const minScaleFactor = MIN_PIXELS_PER_CELL / grid.pixelsPerMathUnit;
    if (scaleFactor < minScaleFactor) {
        console.warn(
            `#PerlinUtils - scaleFactor ${scaleFactor} produces fewer than ${MIN_PIXELS_PER_CELL} pixels per cell. Clamping to ${minScaleFactor.toFixed(4)}.`
        );
        return minScaleFactor;
    }
    return scaleFactor;
}

/**
 * Generates a flat Float32Array of gradient unit vectors, interleaved as
 * [x0, y0, x1, y1, ...] in row-major order (gridCols × gridRows vectors).
 *
 * Grid points are anchored at the origin (0, 0) and spaced `scaleFactor`
 * apart in both axes, then extended to cover [xMin, xMax] × [yMin, yMax].
 */
function buildGradientGrid(
    rng: XoRng,
    xMin: number,
    xMax: number,
    yMin: number,
    yMax: number,
    scaleFactor: number,
): GradientGrid {
    // First grid point <= xMin/yMin that is a multiple of scaleFactor from origin
    const x0 = Math.floor(xMin / scaleFactor) * scaleFactor;
    const y0 = Math.floor(yMin / scaleFactor) * scaleFactor;

    const gridCols = Math.ceil((xMax - x0) / scaleFactor) + 1;
    const gridRows = Math.ceil((yMax - y0) / scaleFactor) + 1;

    const gradients = new Float32Array(gridCols * gridRows * 2); // x,y interleaved

    for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
            const angle = rng.next() * 2 * Math.PI;
            const i = (r * gridCols + c) * 2;
            gradients[i] = Math.cos(angle); // x
            gradients[i + 1] = Math.sin(angle); // y
        }
    }

    return { gradients, gridCols, gridRows, x0, y0 };
}

/**
 * Builds all layers (base + octaves) for a given clamped scale factor.
 * Each successive octave doubles the scaleFactor (lower frequency, broader shapes).
 */
export function buildLayers(
    rng: XoRng,
    xMin: number,
    xMax: number,
    yMin: number,
    yMax: number,
    clampedScaleFactor: number,
    octaveCount: number,
    octaveAmplitudeFactor: number,
): PerlinLayer[] {
    const totalLayers = 1 + octaveCount;
    return Array.from({ length: totalLayers }, (_, i) => {
        const layerScaleFactor = clampedScaleFactor * Math.pow(2, i);
        return {
            grid: buildGradientGrid(rng, xMin, xMax, yMin, yMax, layerScaleFactor),
            amplitude: i === 0 ? 1.0 : Math.pow(octaveAmplitudeFactor, i),
            scaleFactor: layerScaleFactor,
        };
    });
}

/** Quintic fade curve — smooth first and second derivatives. */
export function fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
}

/** Linear interpolation. */
export function lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
}

/**
 * Dot product of the gradient at grid corner (gc, gr) with the offset
 * vector from that corner to the sample point (dx, dy).
 * Gradients are stored interleaved: x at 2*i, y at 2*i+1.
 */
export function dotGrad(
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

export function getCellSetup(
    mx: number,
    my: number,
    x0: number,
    y0: number,
    scaleFactor: number,
    gridCols: number,
    gridRows: number,
): CellSetup {
    const gx = (mx - x0) / scaleFactor;
    const gy = (my - y0) / scaleFactor;

    const gc0 = Math.floor(gx);
    const gr0 = Math.floor(gy);
    const gc1 = gc0 + 1;
    const gr1 = gr0 + 1;

    return {
        c0: Math.min(gc0, gridCols - 1),
        c1: Math.min(gc1, gridCols - 1),
        r0: Math.min(gr0, gridRows - 1),
        r1: Math.min(gr1, gridRows - 1),
        dx0: gx - gc0, dy0: gy - gr0,
        dx1: gx - gc1, dy1: gy - gr1,
        fu: fade(gx - gc0),
        fv: fade(gy - gr0),
    };
}

/**
 * Returns a raw Perlin noise scalar value in approximately [-1, 1]
 * for the math-space point (mx, my).
 */
export function perlinScalarSample(
    mx: number,
    my: number,
    g: GradientGrid,
    scaleFactor: number,
): number {
    const { c0, c1, r0, r1, dx0, dy0, dx1, dy1, fu, fv } = getCellSetup(
        mx, my, g.x0, g.y0, scaleFactor, g.gridCols, g.gridRows
    );

    const n00 = dotGrad(c0, r0, dx0, dy0, g.gradients, g.gridCols);
    const n10 = dotGrad(c1, r0, dx1, dy0, g.gradients, g.gridCols);
    const n01 = dotGrad(c0, r1, dx0, dy1, g.gradients, g.gridCols);
    const n11 = dotGrad(c1, r1, dx1, dy1, g.gradients, g.gridCols);

    return lerp(lerp(n00, n10, fu), lerp(n01, n11, fu), fv);
}

/**
 * Returns the bilinearly interpolated gradient vector at math-space point
 * (mx, my) as [gx, gy]. The result is NOT normalised — its magnitude encodes
 * directional coherence among the four surrounding grid gradients.
 */
export function perlinGradientSample(
    mx: number,
    my: number,
    g: GradientGrid,
    scaleFactor: number,
): [number, number] {
    const { c0, c1, r0, r1, fu, fv } = getCellSetup(
        mx, my, g.x0, g.y0, scaleFactor, g.gridCols, g.gridRows
    );

    // Retrieve the four corner gradient vectors
    const i00 = (r0 * g.gridCols + c0) * 2;
    const i10 = (r0 * g.gridCols + c1) * 2;
    const i01 = (r1 * g.gridCols + c0) * 2;
    const i11 = (r1 * g.gridCols + c1) * 2;

    // Interpolate x and y components independently
    const gx = lerp(
        lerp(g.gradients[i00], g.gradients[i10], fu),
        lerp(g.gradients[i01], g.gradients[i11], fu),
        fv,
    );
    const gy = lerp(
        lerp(g.gradients[i00 + 1], g.gradients[i10 + 1], fu),
        lerp(g.gradients[i01 + 1], g.gradients[i11 + 1], fu),
        fv,
    );

    return [gx, gy];
}
