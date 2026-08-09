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

const TILE_SIZE = 16; // px — coarse granularity for skipping empty/unreachable regions

const EMPTY_TILE = -1; // sentinel: tile has no covered pixels at all

interface MaxRadiusMask {
    maxRadius: Float32Array; // per tile: largest blurRadiusForZ() among its covered pixels, or EMPTY_TILE
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
    const radiusMask = buildMaxRadiusMask(grid, zData, coverageData, config);

    // Resolved once, not per candidate pixel — keeps the billions-of-iterations hot loop
    // as a single monomorphic call instead of re-branching on config.type every time.
    const kernelWeightFn = resolveKernelWeightFn(config);

    const progress = new Progress(grid.height, Progress.getProgressIntervalForResulution(grid.size));
    for (let row = 0; row < grid.height; row++) {
        for (let col = 0; col < grid.width; col++) {
            gatherPixel(col, row, grid, colourData, zData, coverageData, config, searchRadius, radiusMask, kernelWeightFn, output);
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
 * Coarse per-tile grid storing the LARGEST blurRadiusForZ() among that tile's
 * covered pixels (EMPTY_TILE if it has none). Lets gatherPixel skip a tile
 * entirely, via one check, in two situations:
 *  - the tile is empty (nothing there to contribute at all — same role the
 *    old boolean occupancy mask played), or
 *  - the tile is occupied, but even its most-blurred pixel's disc can't
 *    reach this far (its own maxRadius is smaller than the tile's closest
 *    possible distance to the output pixel) — this is the new part: it
 *    means a fixed global search box no longer forces every pixel to pay
 *    for the worst-case maxBlurRadius, only for what's actually nearby.
 * For dense fields (e.g. Mandelbrot) where blur radius varies sharply
 * pixel-to-pixel near the interesting detail, tiles there will tend to
 * have a maxRadius close to the true local max anyway, so this yields much
 * smaller savings there than for sparse, mostly-uniform-z dot scenes.
 */
function buildMaxRadiusMask(
    grid: GridWithoutRange,
    zData: Float32Array,
    coverageData: Uint8ClampedArray,
    config: BokehConfig,
): MaxRadiusMask {
    const tileCols = Math.ceil(grid.width / TILE_SIZE);
    const tileRows = Math.ceil(grid.height / TILE_SIZE);
    const maxRadius = new Float32Array(tileCols * tileRows).fill(EMPTY_TILE);

    for (let row = 0; row < grid.height; row++) {
        const tileRow = Math.floor(row / TILE_SIZE);
        for (let col = 0; col < grid.width; col++) {
            const index = grid.getIndex(col, row);
            if (coverageData[index] === 0) { continue; }

            const radius = blurRadiusForZ(zData[index], config);
            const tileCol = Math.floor(col / TILE_SIZE);
            const tileIndex = tileRow * tileCols + tileCol;
            if (radius > maxRadius[tileIndex]) { maxRadius[tileIndex] = radius; }
        }
    }

    return { maxRadius, tileCols, tileRows };
}

/** Closest possible distance from point (px, py) to an axis-aligned pixel box. */
function distanceToBox(px: number, py: number, xMin: number, xMax: number, yMin: number, yMax: number): number {
    const dx = px < xMin ? xMin - px : (px > xMax ? px - xMax : 0);
    const dy = py < yMin ? yMin - py : (py > yMax ? py - yMax : 0);
    return Math.sqrt(dx * dx + dy * dy);
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
    radiusMask: MaxRadiusMask,
    kernelWeightFn: KernelWeightFn,
    output: Uint8ClampedArray,
): void {
    const colMin = Math.max(0, col - searchRadius);
    const colMax = Math.min(grid.width - 1, col + searchRadius);
    const rowMin = Math.max(0, row - searchRadius);
    const rowMax = Math.min(grid.height - 1, row + searchRadius);

    const tileColMin = Math.floor(colMin / TILE_SIZE);
    const tileColMax = Math.floor(colMax / TILE_SIZE);
    const tileRowMin = Math.floor(rowMin / TILE_SIZE);
    const tileRowMax = Math.floor(rowMax / TILE_SIZE);

    let sumWeight = 0;
    let sumAlpha = 0;
    let sumPremultR = 0;
    let sumPremultG = 0;
    let sumPremultB = 0;

    for (let tileRow = tileRowMin; tileRow <= tileRowMax; tileRow++) {
        for (let tileCol = tileColMin; tileCol <= tileColMax; tileCol++) {
            const tileMaxRadius = radiusMask.maxRadius[tileRow * radiusMask.tileCols + tileCol];
            if (tileMaxRadius === EMPTY_TILE) { continue; } // tile has nothing in it at all

            // tile bounds in pixel space, clipped to the search box
            const tileColStart = Math.max(colMin, tileCol * TILE_SIZE);
            const tileColEnd = Math.min(colMax, tileCol * TILE_SIZE + TILE_SIZE - 1);
            const tileRowStart = Math.max(rowMin, tileRow * TILE_SIZE);
            const tileRowEnd = Math.min(rowMax, tileRow * TILE_SIZE + TILE_SIZE - 1);

            // even this tile's most-blurred pixel can't reach us from its closest possible position — skip
            const tileDistance = distanceToBox(col, row, tileColStart, tileColEnd, tileRowStart, tileRowEnd);
            if (tileDistance > tileMaxRadius) { continue; }

            for (let qRow = tileRowStart; qRow <= tileRowEnd; qRow++) {
                for (let qCol = tileColStart; qCol <= tileColEnd; qCol++) {
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