import { GridWithoutRange } from '../../grid/grid-without-range';
import { Progress } from '../../worker/progress';
import { MessageFromWorker, MessageToWorker } from '../../worker/types';
import { BokehConfig, BokehType } from './types';
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
    const { colourData, zData, coverageData } = setup;
    const config = validateAndClampConfig(setup.config);
    const output = new Uint8ClampedArray(grid.size * 4);

    // Upper bound on how far any source pixel's own blur disc can possibly reach.
    // +1 keeps the antialiased edge band (see kernelWeight) fully inside the search box.
    const searchRadius = Math.ceil(config.maxBlurRadius) + 1;
    const occupancy = buildOccupancyMask(grid, coverageData);

    // Resolved once, not per candidate pixel — keeps the billions-of-iterations hot loop
    // as a single monomorphic call instead of re-branching on config.type every time.
    const kernelWeightFn = resolveKernelWeightFn(config);

    const progress = new Progress(grid.height, Progress.getProgressIntervalForResulution(grid.size));
    for (let row = 0; row < grid.height; row++) {
        for (let col = 0; col < grid.width; col++) {
            gatherPixel(col, row, grid, colourData, zData, coverageData, config, searchRadius, occupancy, kernelWeightFn, output);
        }
        const progressUpdate = progress.update(row);
        if (progressUpdate) self.postMessage({ type: MessageFromWorker.UPDATE, progress: progressUpdate });
    }

    progress.logDone('#BokehProcessor (worker)');
    return output;
}

/** Defensive validation, run once per calculate() call. Logs and clamps anything out of range. */
function validateAndClampConfig(config: BokehConfig): BokehConfig {
    const validatedConfig = structuredClone(config);
    validatedConfig.maxBlurRadius = clampWithWarning('maxBlurRadius', validatedConfig.maxBlurRadius, 0, Infinity);
    validatedConfig.pixelsPerZUnit = clampWithWarning('pixelsPerZUnit', validatedConfig.pixelsPerZUnit, 0, Infinity);
    validatedConfig.edgeSoftnessPx = clampWithWarning('edgeSoftnessPx', validatedConfig.edgeSoftnessPx, 0, Infinity);
    validatedConfig.bladeCount = Math.round(clampWithWarning('bladeCount', validatedConfig.bladeCount, 3, 12));
    validatedConfig.apertureRotation = ((validatedConfig.apertureRotation % 360) + 360) % 360;
    validatedConfig.innerRadiusRatio = clampWithWarning('innerRadiusRatio', validatedConfig.innerRadiusRatio, 0, 1);
    validatedConfig.rimIntensity = clampWithWarning('rimIntensity', validatedConfig.rimIntensity, 1, 10);

    return validatedConfig;
}

function clampWithWarning(name: string, value: number, min: number, max: number): number {
    const clampedValue = Math.max(min, Math.min(max, value));
    if (clampedValue !== value) {
        console.warn(`#BokehConfig - ${name}=${value} out of range [${min}, ${max}], clamped to ${clampedValue}`);
    }
    return clampedValue;
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
    kernelWeightFn: KernelWeightFn,
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

                    const weight = kernelWeightFn(dx, dy, qBlurRadius, config);
                    if (weight <= 0) continue;

                    const qAlpha = qCoverage / 255;
                    const qColourIndex = qIndex * 4;
                    const premultWeight = qAlpha * weight;

                    sumWeight += weight;
                    sumAlpha += premultWeight;
                    sumPremultR += colourData[qColourIndex] * premultWeight;
                    sumPremultG += colourData[qColourIndex + 1] * premultWeight;
                    sumPremultB += colourData[qColourIndex + 2] * premultWeight;
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

type KernelWeightFn = (dx: number, dy: number, radius: number, config: BokehConfig) => number;

/**
 * Picks the shape/intensity-profile function for the configured BokehType ONCE,
 * before the pixel loop runs, rather than switching on config.type per candidate
 * pixel (billions of times over a full image). All types are radially symmetric
 * (only need distance) except POLYGON, which also needs the angle of (dx, dy) to
 * know where it sits relative to the blade orientation — hence every resolved
 * function still receives dx/dy rather than a precomputed distance.
 *
 * Also precomputes anything derivable purely from `config` (e.g. POLYGON's
 * segmentAngle/apothemRatio) here, once, rather than recomputing it — including
 * expensive trig — on every single candidate pixel inside the hot loop.
 */
function resolveKernelWeightFn(config: BokehConfig): KernelWeightFn {
    switch (config.type) {
        case BokehType.SOFT_DISC:
            return (dx, dy, radius, cfg) => softDiscWeight(distanceOf(dx, dy), radius, cfg.edgeSoftnessPx);
        case BokehType.FLAT_DISC:
            return (dx, dy, radius) => flatDiscWeight(distanceOf(dx, dy), radius);
        case BokehType.POLYGON: {
            const segmentAngle = (2 * Math.PI) / config.bladeCount;
            const angleOffset = (config.apertureRotation * Math.PI) / 180 + segmentAngle / 2;
            const apothemRatio = Math.cos(Math.PI / config.bladeCount);
            return (dx, dy, radius, cfg) =>
                polygonWeight(dx, dy, radius, cfg.edgeSoftnessPx, segmentAngle, angleOffset, apothemRatio);
        }
        case BokehType.RING:
            return (dx, dy, radius, config) => ringWeight(distanceOf(dx, dy), radius, config);
        case BokehType.BRIGHT_RIM:
            return (dx, dy, radius, config) => brightRimWeight(distanceOf(dx, dy), radius, config);
    }
}

function distanceOf(dx: number, dy: number): number {
    return Math.sqrt(dx * dx + dy * dy);
}

/** Uniform-intensity disc with a soft, edgeSoftnessPx-wide antialiased edge. */
function softDiscWeight(distance: number, radius: number, edgeSoftnessPx: number): number {
    return softEdge(radius - distance, edgeSoftnessPx);
}

/** Same disc, but always a hard step edge — ignores edgeSoftnessPx by design (see brainstorm notes). */
function flatDiscWeight(distance: number, radius: number): number {
    return distance <= radius ? 1 : 0;
}

/**
 * Regular-polygon aperture (straight-blade look). The disc radius varies with
 * angle: full `radius` at each vertex, down to the apothem (radius * apothemRatio)
 * at each edge midpoint — so effectiveRadius is always within [apothem, radius].
 *
 * That bound lets most candidates skip the expensive atan2/cos entirely:
 * anything farther than `radius` is guaranteed outside regardless of angle,
 * and anything closer than the apothem is guaranteed inside regardless of angle.
 * Only the thin boundary shell between the two actually needs the real angle
 * calculation to know exactly where within that range it falls.
 */
function polygonWeight(
    dx: number,
    dy: number,
    radius: number,
    edgeSoftnessPx: number,
    segmentAngle: number,
    angleOffset: number,
    apothemRatio: number,
): number {
    const distance = distanceOf(dx, dy);
    const apothem = radius * apothemRatio;
    const halfSoft = edgeSoftnessPx / 2;

    if (distance > radius + halfSoft) { return 0; }         // clearly outside at every angle
    if (distance < apothem - halfSoft) { return 1; }         // clearly inside at every angle

    // boundary shell — angle actually matters here
    const angle = Math.atan2(dy, dx) - angleOffset;
    const wrapped = ((angle % segmentAngle) + segmentAngle) % segmentAngle - segmentAngle / 2;
    const effectiveRadius = apothem / Math.cos(wrapped);

    return softEdge(effectiveRadius - distance, edgeSoftnessPx);
}

/** Annulus — softened outer boundary AND softened inner hole boundary. */
function ringWeight(distance: number, radius: number, config: BokehConfig): number {
    const innerRadius = radius * config.innerRadiusRatio;
    const outer = softEdge(radius - distance, config.edgeSoftnessPx);
    const inner = softEdge(distance - innerRadius, config.edgeSoftnessPx);
    return outer * inner;
}

/** Soft disc whose intensity increases toward the edge ("soap bubble" look). */
function brightRimWeight(distance: number, radius: number, config: BokehConfig): number {
    const base = softEdge(radius - distance, config.edgeSoftnessPx);
    const normalizedDistance = radius > 0 ? clamp01(distance / radius) : 0;
    const rimMultiplier = lerp(1, config.rimIntensity, normalizedDistance);
    return base * rimMultiplier;
}

/** Analytic antialiased edge band, `edgeSoftnessPx` wide, centered on delta=0. */
function softEdge(delta: number, edgeSoftnessPx: number): number {
    if (edgeSoftnessPx <= 0) { return delta >= 0 ? 1 : 0; }
    return clamp01(delta / edgeSoftnessPx + 0.5);
}

function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

function clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
}