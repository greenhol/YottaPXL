import { GridWithMargin } from '../../../grid/grid-with-margin';
import { RGB } from '../../../types';
import { Progress } from '../../../worker/progress';
import { MessageFromWorker, MessageToWorker } from '../../../worker/types';
import { ColorSeed, WorkerSetupAdvectionColor } from './worker-setup-advection-color';

interface RGBA extends RGB { a: number; }

interface SpatialIndex {
    cells: Map<string, ColorSeed[]>;
    cellSize: number;
}

const TRANSPARENT: RGBA = { r: 0, g: 0, b: 0, a: 0 };

self.onmessage = (e) => {
    const { type, data }: { type: MessageToWorker, data: WorkerSetupAdvectionColor; } = e.data;
    if (type === MessageToWorker.START) {
        const result = calculate(data);
        self.postMessage({ type: MessageFromWorker.RESULT, result }, [result.buffer]);
    }
};

function calculate(setup: WorkerSetupAdvectionColor): Uint8ClampedArray {
    const grid = GridWithMargin.copyWithMargin(setup.gridBlueprint);
    const data = new Uint8ClampedArray(grid.size * 4);

    const spatialIndex = buildSpatialIndex(setup.seeds, setup.quality.influenceRadius);

    const progress = new Progress(grid.height, Progress.getProgressIntervalForResulution(grid.size));
    for (let row = 0; row < grid.height; row++) {
        for (let col = 0; col < grid.width; col++) {
            const [x, y] = grid.pixelToMath(col, row);
            const color = advectColor(x, y, grid, setup, spatialIndex);
            const index = grid.getIndex(col, row) * 4;
            data[index] = color.r;
            data[index + 1] = color.g;
            data[index + 2] = color.b;
            data[index + 3] = color.a;
        }
        const progressUpdate = progress.update(row);
        if (progressUpdate) self.postMessage({ type: MessageFromWorker.UPDATE, progress: progressUpdate });
    }

    progress.logDone('#AdvectionColor (worker)');
    return data;
}

// ── Spatial index ─────────────────────────────────────────────────────────────
function buildSpatialIndex(seeds: ColorSeed[], influenceRadius: number): SpatialIndex {
    // Cell size matches influence radius so only immediate neighbors need checking
    const cellSize = influenceRadius;
    const cells = new Map<string, ColorSeed[]>();

    for (const seed of seeds) {
        const key = cellKey(seed.x, seed.y, cellSize);
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key)!.push(seed);
    }

    return { cells, cellSize };
}

function cellKey(x: number, y: number, cellSize: number): string {
    return `${Math.floor(x / cellSize)},${Math.floor(y / cellSize)}`;
}

function nearbySeeds(x: number, y: number, index: SpatialIndex): ColorSeed[] {
    const cx = Math.floor(x / index.cellSize);
    const cy = Math.floor(y / index.cellSize);
    const result: ColorSeed[] = [];

    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            const key = `${cx + dx},${cy + dy}`;
            const cell = index.cells.get(key);
            if (cell) result.push(...cell);
        }
    }

    return result;
}

// ── Vector field sampling ─────────────────────────────────────────────────────
function sampleField(
    x: number,
    y: number,
    grid: GridWithMargin,
    vectorField: Float32Array,
): [number, number] {
    // Clamp to grid bounds
    const xMin = grid.range.xMin.toNumber();
    const xMax = grid.range.xMax.toNumber();
    const yMin = grid.yMin.toNumber();
    const yMax = grid.yMax.toNumber();

    const cx = Math.max(xMin, Math.min(xMax, x));
    const cy = Math.max(yMin, Math.min(yMax, y));

    const [col, row] = grid.mathToPixel(cx, cy);
    const index = grid.getIndex(
        Math.max(0, Math.min(grid.width - 1, Math.round(col))),
        Math.max(0, Math.min(grid.height - 1, Math.round(row))),
    ) * 3;

    return [vectorField[index], vectorField[index + 1]];
}

// ── Advection ─────────────────────────────────────────────────────────────────
function advectColor(
    x: number,
    y: number,
    grid: GridWithMargin,
    setup: WorkerSetupAdvectionColor,
    spatialIndex: SpatialIndex,
): RGBA {
    let px = x;
    let py = y;

    let rAcc = 0, gAcc = 0, bAcc = 0, wAcc = 0;
    const stepSize = setup.quality.influenceRadius * 0.5;

    for (let step = 0; step < setup.quality.stepCount; step++) {
        // Accumulate weighted color contributions from nearby seeds
        const nearby = nearbySeeds(px, py, spatialIndex);
        for (const seed of nearby) {
            const dx = px - seed.x;
            const dy = py - seed.y;
            const d2 = dx * dx + dy * dy;
            const r2 = setup.quality.influenceRadius * setup.quality.influenceRadius;
            const w = Math.exp(-d2 / r2);
            if (w > 1e-6) {
                rAcc += seed.color.r * w;
                gAcc += seed.color.g * w;
                bAcc += seed.color.b * w;
                wAcc += w;
            }
        }

        // Step backward along the field
        const [vX, vY] = sampleField(px, py, grid, setup.vectorField);
        px -= vX * stepSize;
        py -= vY * stepSize;
    }

    if (wAcc === 0) return TRANSPARENT;

    return {
        r: Math.round(rAcc / wAcc),
        g: Math.round(gAcc / wAcc),
        b: Math.round(bAcc / wAcc),
        a: 255,
    };
}
