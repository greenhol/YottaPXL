import { GridWithoutRange } from '../../grid/grid-without-range';
import { Progress } from '../../worker/progress';
import { MessageFromWorker, MessageToWorker } from '../../worker/types';
import { BokehConfig } from './types';
import { WorkerSetupBokeh } from './worker-setup-bokeh';

self.onmessage = (e) => {
    const { type, data }: { type: MessageFromWorker | MessageToWorker, data: WorkerSetupBokeh; } = e.data;
    if (type === MessageToWorker.START) {
        const result = calculate(data);
        self.postMessage({ type: MessageFromWorker.RESULT, result }, [result.buffer]);
    }
};

const OCCUPANCY_TILE_SIZE = 16; // px — coarse granularity for skipping empty regions

interface OccupancyMask {
    tiles: Uint8Array; // 1 = tile contains at least one covered pixel, 0 = fully empty
    tileCols: number;
    tileRows: number;
}

function calculate(setup: WorkerSetupBokeh): Uint8ClampedArray {
    const grid = GridWithoutRange.copyWithoutRange(setup.gridBlueprint);
    const { colourData, zData, coverageData, config } = setup;
    const output = new Uint8ClampedArray(grid.size * 4);

    // Upper bound on how far any source pixel's own blur disc can possibly reach.
    // +1 keeps the antialiased edge band (see kernelWeight) fully inside the search box.
    const searchRadius = Math.ceil(config.maxBlurRadius) + 1;
    const occupancy = buildOccupancyMask(grid, coverageData);

    const progress = new Progress(grid.height, Progress.getProgressIntervalForResulution(grid.size));
    for (let row = 0; row < grid.height; row++) {
        for (let col = 0; col < grid.width; col++) {
            gatherPixel(col, row, grid, colourData, zData, coverageData, config, searchRadius, occupancy, output);
        }
        const progressUpdate = progress.update(row);
        if (progressUpdate) self.postMessage({ type: MessageFromWorker.UPDATE, progress: progressUpdate });
    }

    progress.logDone('#BokehProcessor (worker)');
    return output;
}

/**
 * Coarse "does this region contain anything at all" grid, built once from
 * coverageData. Lets gatherPixel skip whole empty regions of the search box
 * in one check instead of scanning every individual empty pixel within them.
 * For dense fields (e.g. Mandelbrot, coverage=255 everywhere) every tile ends
 * up occupied, so this degenerates to the original brute-force behaviour —
 * it only pays off for scenes with genuinely empty background.
 */
function buildOccupancyMask(grid: GridWithoutRange, coverageData: Uint8ClampedArray): OccupancyMask {
    const tileCols = Math.ceil(grid.width / OCCUPANCY_TILE_SIZE);
    const tileRows = Math.ceil(grid.height / OCCUPANCY_TILE_SIZE);
    const tiles = new Uint8Array(tileCols * tileRows);

    for (let row = 0; row < grid.height; row++) {
        const tileRow = Math.floor(row / OCCUPANCY_TILE_SIZE);
        for (let col = 0; col < grid.width; col++) {
            if (coverageData[grid.getIndex(col, row)] === 0) { continue; }
            const tileCol = Math.floor(col / OCCUPANCY_TILE_SIZE);
            tiles[tileRow * tileCols + tileCol] = 1;
        }
    }

    return { tiles, tileCols, tileRows };
}

/**
 * Computes the output colour for a single pixel (col, row) by gathering
 * from every nearby source pixel whose OWN blur disc reaches this pixel
 * ("scatter formulated as gather" — avoids gaps a naive scatter would leave).
 * Accumulates premultiplied colour so partially-covered / semi-transparent
 * source pixels contribute proportionally, then un-premultiplies at the end.
 */
function gatherPixel(
    col: number,
    row: number,
    grid: GridWithoutRange,
    colourData: Uint8ClampedArray,
    zData: Float32Array,
    coverageData: Uint8ClampedArray,
    config: BokehConfig,
    searchRadius: number,
    occupancy: OccupancyMask,
    output: Uint8ClampedArray,
): void {
    const colMin = Math.max(0, col - searchRadius);
    const colMax = Math.min(grid.width - 1, col + searchRadius);
    const rowMin = Math.max(0, row - searchRadius);
    const rowMax = Math.min(grid.height - 1, row + searchRadius);

    const tileColMin = Math.floor(colMin / OCCUPANCY_TILE_SIZE);
    const tileColMax = Math.floor(colMax / OCCUPANCY_TILE_SIZE);
    const tileRowMin = Math.floor(rowMin / OCCUPANCY_TILE_SIZE);
    const tileRowMax = Math.floor(rowMax / OCCUPANCY_TILE_SIZE);

    let sumWeight = 0;
    let sumAlpha = 0;
    let sumPremultR = 0;
    let sumPremultG = 0;
    let sumPremultB = 0;

    for (let tileRow = tileRowMin; tileRow <= tileRowMax; tileRow++) {
        for (let tileCol = tileColMin; tileCol <= tileColMax; tileCol++) {
            if (occupancy.tiles[tileRow * occupancy.tileCols + tileCol] === 0) { continue; } // whole tile empty, skip entirely

            // clip this tile's pixel range to both the tile's own bounds and the search box
            const qRowStart = Math.max(rowMin, tileRow * OCCUPANCY_TILE_SIZE);
            const qRowEnd = Math.min(rowMax, tileRow * OCCUPANCY_TILE_SIZE + OCCUPANCY_TILE_SIZE - 1);
            const qColStart = Math.max(colMin, tileCol * OCCUPANCY_TILE_SIZE);
            const qColEnd = Math.min(colMax, tileCol * OCCUPANCY_TILE_SIZE + OCCUPANCY_TILE_SIZE - 1);

            for (let qRow = qRowStart; qRow <= qRowEnd; qRow++) {
                for (let qCol = qColStart; qCol <= qColEnd; qCol++) {
                    const qIndex = grid.getIndex(qCol, qRow);
                    const qCoverage = coverageData[qIndex];
                    if (qCoverage === 0) continue; // empty pixel within an otherwise-occupied tile

                    const qBlurRadius = blurRadiusForZ(zData[qIndex], config);
                    const dx = qCol - col;
                    const dy = qRow - row;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    const weight = kernelWeight(distance, qBlurRadius);
                    if (weight <= 0) continue;

                    const qAlpha = qCoverage / 255;
                    const qcolourIndex = qIndex * 4;
                    const premultWeight = qAlpha * weight;

                    sumWeight += weight;
                    sumAlpha += premultWeight;
                    sumPremultR += colourData[qcolourIndex] * premultWeight;
                    sumPremultG += colourData[qcolourIndex + 1] * premultWeight;
                    sumPremultB += colourData[qcolourIndex + 2] * premultWeight;
                }
            }
        }
    }

    const outIndex = grid.getIndex(col, row) * 4;
    if (sumWeight <= 0 || sumAlpha <= 0) {
        output[outIndex] = 0;
        output[outIndex + 1] = 0;
        output[outIndex + 2] = 0;
        output[outIndex + 3] = 0;
        return;
    }

    output[outIndex] = sumPremultR / sumAlpha;
    output[outIndex + 1] = sumPremultG / sumAlpha;
    output[outIndex + 2] = sumPremultB / sumAlpha;
    output[outIndex + 3] = (sumAlpha / sumWeight) * 255;
}

function blurRadiusForZ(z: number, config: BokehConfig): number {
    const raw = Math.abs(z - config.focusZ) * config.pixelsPerZUnit;
    return Math.min(config.maxBlurRadius, raw);
}

/** Analytic ~1px antialiased edge band, consistent with the rasterizer's own AA approach. */
function kernelWeight(distance: number, radius: number): number {
    return clamp01(radius - distance + 0.5);
}

function clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
}