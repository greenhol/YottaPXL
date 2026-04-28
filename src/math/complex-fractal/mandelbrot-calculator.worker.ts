import { Grid } from '../../grid/grid';
import { BigDecimal } from '../../types';
import { MessageFromWorker, MessageToWorker } from '../../worker/types';
import { CalculationType } from './types';
import { WorkerSetupMandelbrot } from './worker-setup-mandelbrot';

self.onmessage = (e) => {
    let timeStamp = Date.now();
    const { type, data } = e.data;
    if (type === MessageToWorker.START) {
        let result: Float64Array;
        switch ((data as WorkerSetupMandelbrot).type) {
            case CalculationType.ITERATIONS:
                result = calculateIterations(data);
                break;
            case CalculationType.ITERATIONS_PT:
                result = calculateIterationsPT(data);
                break;
            case CalculationType.ITERATIONS_SMOOTH:
                result = calculateSmoothIterations(data);
                break;
            case CalculationType.ITERATIONS_SMOOTH_PT:
                result = calculateSmoothIterationsPT(data);
                break;
            case CalculationType.DISTANCE:
                result = calculateDistances(data);
                break;
            case CalculationType.DISTANCE_PT:
                result = calculateDistancesPT(data);
                break;
        }
        console.info(`#MandelbrotCalculator (worker) - calculation for ${data.type} done in ${(Date.now() - timeStamp) / 1000}s`);
        self.postMessage({ type: MessageFromWorker.RESULT, result }, [result.buffer]);
    }
};

/** ---------------------------------------------- REFERENCE ORBIT ---------------------------------------------- */
/** ------------------------------------------------------------------------------------------------------------- */
interface ReferenceOrbit {
    /** Z_ref_n at each iteration step n, in plain float64 (lossy but sufficient for delta arithmetic) */
    reZ: Float64Array;
    imZ: Float64Array;
    /** Always maxIterations — orbit is computed for all steps regardless of escape */
    length: number;
    /** Grid column of the chosen reference pixel */
    colRef: number;
    /** Grid row of the chosen reference pixel */
    rowRef: number;
    /** Pixel step size in math-space as a plain number, used to compute delta offsets per pixel */
    pixelStep: number;
}

/**
 * Selects the best reference point from a sparse candidate grid and computes its orbit.
 *
 * A 5x5 grid of candidate pixels is evaluated in BigDecimal. The candidate with the
 * highest iteration count is chosen as the reference point — this maximises the orbit
 * length available to surrounding pixels and minimises black regions caused by the
 * orbit running out before a pixel escapes.
 *
 * Interior points are penalised (scored at 50% of maxIterations) to prefer
 * boundary-hugging exterior points, which have healthier |Z_ref| values and
 * lower glitch risk.
 */
function computeReferenceOrbit(setup: WorkerSetupMandelbrot, grid: Grid): ReferenceOrbit {
    grid.switchToBigDecimalStrategy();

    const maxIter = setup.maxIterations;
    const escapeValue = setup.escapeValue;

    // Pixel step: width of one pixel in math-space, converted to float64 once
    const xRange = grid.range.xMax.sub(grid.range.xMin);
    const pixelStep = xRange.div(BigDecimal.fromNumber(grid.width)).toNumber();

    // Try user-defined reference coordinate first
    let bestCol = -1;
    let bestRow = -1;

    if (setup.referenceCoordinate.trim() !== '') {
        const parts = setup.referenceCoordinate.split(',');
        if (parts.length === 2) {
            const parsedCol = parseInt(parts[0].trim(), 10);
            const parsedRow = parseInt(parts[1].trim(), 10);
            if (
                !isNaN(parsedCol) && !isNaN(parsedRow) &&
                parsedCol >= 0 && parsedCol < grid.width &&
                parsedRow >= 0 && parsedRow < grid.height
            ) {
                bestCol = parsedCol;
                bestRow = parsedRow;
                console.info(`#MandelbrotCalculator - using user-defined reference point at (${bestCol}, ${bestRow})`);
            } else {
                console.log(`#MandelbrotCalculator - referenceCoordinate '${setup.referenceCoordinate}' is out of bounds (image is ${grid.width}x${grid.height}), falling back to grid scan`);
            }
        } else {
            console.log(`#MandelbrotCalculator - referenceCoordinate '${setup.referenceCoordinate}' is not a valid 'col, row' format, falling back to grid scan`);
        }
    }

    // Fall back to 5x5 candidate grid scan if no valid user coordinate was provided
    if (bestCol === -1) {
        const GRID_SIZE = 5;
        bestCol = Math.floor(grid.width / 2);
        bestRow = Math.floor(grid.height / 2);
        let bestScore = -1;

        for (let gi = 0; gi < GRID_SIZE; gi++) {
            for (let gj = 0; gj < GRID_SIZE; gj++) {
                const col = Math.floor((gi + 0.5) * grid.width / GRID_SIZE);
                const row = Math.floor((gj + 0.5) * grid.height / GRID_SIZE);
                const score = evaluateCandidate(col, row, grid, maxIter, escapeValue);
                if (score > bestScore) {
                    bestScore = score;
                    bestCol = col;
                    bestRow = row;
                }
            }
        }

        console.info(`#MandelbrotCalculator - reference point selected via grid scan at (${bestCol}, ${bestRow}) with score ${bestScore}`);
    }

    // Compute full orbit for the winning candidate
    const { reZArr, imZArr } = computeOrbitForCandidate(bestCol, bestRow, grid, maxIter, escapeValue);

    return {
        reZ: reZArr,
        imZ: imZArr,
        length: maxIter,
        colRef: bestCol,
        rowRef: bestRow,
        pixelStep: pixelStep,
    };
}

/**
 * Evaluates a single candidate point in BigDecimal and returns its iteration count.
 *
 * Interior points (reaching maxIterations without escaping) are scored at
 * maxIterations * 0.5 to prefer boundary-hugging exterior points over interior
 * points, which carry higher glitch risk due to |Z_ref| staying near zero.
 */
function evaluateCandidate(
    col: number, row: number,
    grid: Grid,
    maxIterations: number, escapeValue: number
): number {
    const [reC, imC] = grid.pixelToMathBigDecimal(col, row);

    let reZ = BigDecimal.ZERO;
    let imZ = BigDecimal.ZERO;

    for (let n = 0; n < maxIterations; n++) {
        const reZ2 = reZ.mul(reZ).sub(imZ.mul(imZ)).add(reC);
        const imZ2 = reZ.mul(imZ).add(imZ.mul(reZ)).add(imC);
        reZ = reZ2;
        imZ = imZ2;

        const reN = reZ.toNumber();
        const imN = imZ.toNumber();
        if (reN * reN + imN * imN >= escapeValue) {
            return n + 1; // escaped at iteration n+1
        }
    }

    // Inside the set — valid long orbit but higher glitch risk
    return maxIterations * 0.5;
}

/**
 * Computes the full reference orbit for the chosen reference point.
 *
 * The orbit Z_0, Z_1, ..., Z_maxIter is computed in BigDecimal for full precision,
 * then stored as plain float64 pairs. Once the reference escapes, further values
 * would overflow, so we stop BigDecimal iteration at escape and fill the remainder
 * with zeros — no pixel needs orbit values beyond the step at which it itself escapes,
 * which is always <= the reference escape step for a well-chosen reference.
 *
 * pixelStep = (xMax - xMin) / width, computed in BigDecimal then converted to float64.
 * The rounding error is a uniform scale factor across all pixels and visually
 * undetectable — see discussion in project notes.
 */
function computeOrbitForCandidate(
    col: number, row: number,
    grid: Grid,
    maxIterations: number, escapeValue: number
): { reZArr: Float64Array, imZArr: Float64Array; } {
    const [reC, imC] = grid.pixelToMathBigDecimal(col, row);

    const reZArr = new Float64Array(maxIterations + 1);
    const imZArr = new Float64Array(maxIterations + 1);
    reZArr[0] = 0;
    imZArr[0] = 0;

    let reZ = BigDecimal.ZERO;
    let imZ = BigDecimal.ZERO;
    let escaped = false;

    for (let n = 0; n < maxIterations; n++) {
        if (!escaped) {
            const reZ2 = reZ.mul(reZ).sub(imZ.mul(imZ)).add(reC);
            const imZ2 = reZ.mul(imZ).add(imZ.mul(reZ)).add(imC);
            reZ = reZ2;
            imZ = imZ2;

            const reN = reZ.toNumber();
            const imN = imZ.toNumber();
            reZArr[n + 1] = reN;
            imZArr[n + 1] = imN;

            if (reN * reN + imN * imN >= escapeValue) {
                escaped = true;
            }
        } else {
            // Reference has escaped — values would overflow BigDecimal.
            // Fill with zeros: no surrounding pixel needs orbit data beyond
            // its own escape step, which must be <= the reference escape step
            // for a correctly chosen reference point.
            reZArr[n + 1] = 0;
            imZArr[n + 1] = 0;
        }
    }

    return { reZArr, imZArr };
}

/** ---------------------------------------------- ITERATIONS ---------------------------------------------- */
/** -------------------------------------------------------------------------------------------------------- */
function calculateIterations(setup: WorkerSetupMandelbrot): Float64Array {
    const grid = Grid.copy(setup.gridBlueprint);
    let cnt = 0;
    const targetData = new Float64Array(grid.size);
    for (let row = 0; row < grid.height; row++) {
        for (let col = 0; col < grid.width; col++) {
            targetData[grid.getIndex(col, row)] = calculateIterationsForPixel(col, row, grid, setup.maxIterations, setup.escapeValue);
        }
        cnt += grid.width;
        if (cnt > 50000) {
            const progress = Math.round(100 * (row * grid.width) / grid.size);
            self.postMessage({ type: MessageFromWorker.UPDATE, progress });
            cnt = 0;
        }
    }
    return targetData;
}

function calculateIterationsPT(setup: WorkerSetupMandelbrot): Float64Array {
    const grid = Grid.copy(setup.gridBlueprint);
    const orbit = computeReferenceOrbit(setup, grid);
    let cnt = 0;
    const targetData = new Float64Array(grid.size);
    for (let row = 0; row < grid.height; row++) {
        for (let col = 0; col < grid.width; col++) {
            targetData[grid.getIndex(col, row)] = calculateIterationsPTForPixel(
                col, row, orbit, setup.maxIterations, setup.escapeValue
            );
        }
        cnt += grid.width;
        if (cnt > 50000) {
            const progress = Math.round(100 * (row * grid.width) / grid.size);
            self.postMessage({ type: MessageFromWorker.UPDATE, progress });
            cnt = 0;
        }
    }
    return targetData;
}

function calculateIterationsForPixel(col: number, row: number, grid: Grid, maxIterations: number, escapeValue: number): number {
    const [reC, imC] = grid.pixelToMath(col, row);
    let reZ = 0;
    let imZ = 0;
    let iteration = 0;
    while (reZ * reZ + imZ * imZ < escapeValue && iteration < maxIterations) {
        const xTemp = reZ * reZ - imZ * imZ + reC;
        imZ = 2 * reZ * imZ + imC;
        reZ = xTemp;
        iteration++;
    }

    return iteration;
}

function calculateIterationsForPixelBigDecimal(col: number, row: number, grid: Grid, maxIterations: number, escapeValue: number): number {
    const [reC, imC] = grid.pixelToMathBigDecimal(col, row);
    let reZ = BigDecimal.ZERO;
    let imZ = BigDecimal.ZERO;
    let iteration = 0;
    while (reZ.mul(reZ).add(imZ.mul(imZ)).lt(BigDecimal.fromNumber(escapeValue)) && iteration < maxIterations) {
        const xTemp = reZ.mul(reZ).sub(imZ.mul(imZ)).add(reC);
        imZ = BigDecimal.fromNumber(2).mul(reZ).mul(imZ).add(imC);
        reZ = xTemp;
        iteration++;
    }

    return iteration;
}

/**
 * Perturbation theory iteration count for a single pixel.
 *
 * δc = (col - refCol, row - refRow) * pixelStep  — the offset of this pixel from the reference
 * δz recurrence: δz_{n+1} = 2·Z_ref_n·δz_n + δz_n² + δc
 * Full orbit: Z_n = Z_ref_n + δz_n, used to test escape.
 *
 * Glitch detection: if |δz_n| > 1e-3 · |Z_ref_n|, the perturbation has grown too large
 * relative to the reference and the result would be wrong. We fall back to the plain
 * iteration for this pixel. A more sophisticated implementation would re-render glitched
 * pixels with a local reference point.
 */
function calculateIterationsPTForPixel(
    col: number,
    row: number,
    orbit: ReferenceOrbit,
    maxIterations: number,
    escapeValue: number,
): number {
    const reDc = (col - orbit.colRef) * orbit.pixelStep;
    const imDc = (row - orbit.rowRef) * -orbit.pixelStep; // y-axis is inverted in canvas space

    let reDz = 0;
    let imDz = 0;

    for (let n = 0; n < orbit.length; n++) {
        const reRef = orbit.reZ[n];
        const imRef = orbit.imZ[n];

        // δz_{n+1} = 2·Z_ref_n·δz_n + δz_n² + δc
        const reDzNew = 2 * (reRef * reDz - imRef * imDz) + (reDz * reDz - imDz * imDz) + reDc;
        const imDzNew = 2 * (reRef * imDz + imRef * reDz) + 2 * reDz * imDz + imDc;
        reDz = reDzNew;
        imDz = imDzNew;

        // Full Z = Z_ref + δz
        const reZ = orbit.reZ[n + 1] + reDz;
        const imZ = orbit.imZ[n + 1] + imDz;

        // Escape check
        if (reZ * reZ + imZ * imZ >= escapeValue) {
            return n + 1;
        }
    }

    return maxIterations;
}

/** ---------------------------------------------- SMOOTH ITERATIONS ---------------------------------------------- */
/** --------------------------------------------------------------------------------------------------------------- */
function calculateSmoothIterations(setup: WorkerSetupMandelbrot): Float64Array {
    const grid = Grid.copy(setup.gridBlueprint);
    let cnt = 0;
    const targetData = new Float64Array(grid.size);
    for (let row = 0; row < grid.height; row++) {
        for (let col = 0; col < grid.width; col++) {
            targetData[grid.getIndex(col, row)] = calculateSmoothIterationForPixel(col, row, grid, setup.maxIterations, setup.escapeValue);
        }
        cnt += grid.width;
        if (cnt > 50000) {
            const progress = Math.round(100 * (row * grid.width) / grid.size);
            self.postMessage({ type: MessageFromWorker.UPDATE, progress });
            cnt = 0;
        }
    }

    return targetData;
}

function calculateSmoothIterationsPT(setup: WorkerSetupMandelbrot): Float64Array {
    const grid = Grid.copy(setup.gridBlueprint);
    const orbit = computeReferenceOrbit(setup, grid);
    let cnt = 0;
    const targetData = new Float64Array(grid.size);
    for (let row = 0; row < grid.height; row++) {
        for (let col = 0; col < grid.width; col++) {
            targetData[grid.getIndex(col, row)] = calculateSmoothIterationsPTForPixel(
                col, row, orbit, setup.maxIterations, setup.escapeValue
            );
        }
        cnt += grid.width;
        if (cnt > 50000) {
            const progress = Math.round(100 * (row * grid.width) / grid.size);
            self.postMessage({ type: MessageFromWorker.UPDATE, progress });
            cnt = 0;
        }
    }

    return targetData;
}

function calculateSmoothIterationForPixel(col: number, row: number, grid: Grid, maxIterations: number, escapeValue: number): number {
    const [reC, imC] = grid.pixelToMath(col, row);
    let reZ = 0;
    let imZ = 0;
    let iteration = 0;
    while (iteration < maxIterations) {
        const re_z_squared = reZ * reZ - imZ * imZ;
        const im_z_squared = 2 * reZ * imZ;
        reZ = re_z_squared + reC;
        imZ = im_z_squared + imC;

        const absZ = Math.sqrt(reZ * reZ + imZ * imZ);
        if (absZ > escapeValue) {
            // Fixed: log(|Z|) not log(|Z|)/2
            const logLogZn = Math.log(Math.log(absZ)) / Math.log(2);
            return iteration + 1 - logLogZn;
        }
        iteration++;
    }

    return maxIterations;
}

/**
 * Smooth iteration count via perturbation theory.
 * The smoothing uses |Z_n| = |Z_ref_n + δz_n| at the escape step, exactly as in the
 * plain version — perturbation only changes how Z_n is computed, not how it is used.
 */
function calculateSmoothIterationsPTForPixel(
    col: number,
    row: number,
    orbit: ReferenceOrbit,
    maxIterations: number,
    escapeValue: number,
): number {
    const reDc = (col - orbit.colRef) * orbit.pixelStep;
    const imDc = (row - orbit.rowRef) * -orbit.pixelStep; // y-axis is inverted in canvas space

    let reDz = 0;
    let imDz = 0;

    for (let n = 0; n < orbit.length; n++) {
        const reRef = orbit.reZ[n];
        const imRef = orbit.imZ[n];

        const reDzNew = 2 * (reRef * reDz - imRef * imDz) + (reDz * reDz - imDz * imDz) + reDc;
        const imDzNew = 2 * (reRef * imDz + imRef * reDz) + 2 * reDz * imDz + imDc;
        reDz = reDzNew;
        imDz = imDzNew;

        const reZ = orbit.reZ[n + 1] + reDz;
        const imZ = orbit.imZ[n + 1] + imDz;
        const absZ = Math.sqrt(reZ * reZ + imZ * imZ);

        if (absZ > escapeValue) {
            const logLogZn = Math.log(Math.log(absZ)) / Math.log(2);
            return n + 2 - logLogZn;
        }
    }

    return maxIterations;
}

/** ---------------------------------------------- DISTANCES ---------------------------------------------- */
/** ------------------------------------------------------------------------------------------------------- */

function calculateDistances(setup: WorkerSetupMandelbrot): Float64Array {
    const grid = Grid.copy(setup.gridBlueprint);
    let cnt = 0;
    const targetData = new Float64Array(grid.size);
    for (let row = 0; row < grid.height; row++) {
        for (let col = 0; col < grid.width; col++) {
            targetData[grid.getIndex(col, row)] = calculateDistanceForPixel(col, row, grid, setup.maxIterations, setup.escapeValue);
        }
        cnt += grid.width;
        if (cnt > 50000) {
            const progress = Math.round(100 * (row * grid.width) / grid.size);
            self.postMessage({ type: MessageFromWorker.UPDATE, progress });
            cnt = 0;
        }
    }

    return targetData;
}

function calculateDistancesPT(setup: WorkerSetupMandelbrot): Float64Array {
    const grid = Grid.copy(setup.gridBlueprint);
    const orbit = computeReferenceOrbit(setup, grid);
    let cnt = 0;
    const targetData = new Float64Array(grid.size);
    for (let row = 0; row < grid.height; row++) {
        for (let col = 0; col < grid.width; col++) {
            targetData[grid.getIndex(col, row)] = calculateDistancePTForPixel(
                col, row, orbit, setup.maxIterations, setup.escapeValue
            );
        }
        cnt += grid.width;
        if (cnt > 50000) {
            const progress = Math.round(100 * (row * grid.width) / grid.size);
            self.postMessage({ type: MessageFromWorker.UPDATE, progress });
            cnt = 0;
        }
    }

    return targetData;
}

function calculateDistanceForPixel(col: number, row: number, grid: Grid, maxIterations: number, escapeValue: number): number {
    const [reC, imC] = grid.pixelToMath(col, row);

    let reZ = 0;
    let imZ = 0;
    let reZdiff = 1;
    let imZdiff = 0;
    let iteration = 0;

    do {
        const reZnew = reZ * reZ - imZ * imZ + reC;
        const imZnew = 2 * reZ * imZ + imC;

        const reZdiffNew = 2 * (reZ * reZdiff - imZ * imZdiff) + 1;
        const imZdiffNew = 2 * (reZ * imZdiff + imZ * reZdiff);

        reZ = reZnew;
        imZ = imZnew;
        reZdiff = reZdiffNew;
        imZdiff = imZdiffNew;

        iteration++;
    } while (iteration <= maxIterations && modulus(reZ, imZ) < escapeValue);

    return (iteration >= maxIterations) ? 0 : (modulus(reZ, imZ) * Math.log(modulus(reZ, imZ))) / modulus(reZdiff, imZdiff);
}

/**
 * Distance estimation via perturbation theory.
 *
 * The derivative dZ/dc is tracked alongside Z, adapted for the delta formulation:
 *   dδz_{n+1}/dδc = 2·Z_ref_n · dδz_n/dδc + 2·δz_n · dδz_n/dδc + 1
 *
 * At escape, the full derivative is dZ/dc = dδz/dδc (since Z_ref contribution cancels),
 * and the distance estimate is computed identically to the plain version.
 */
function calculateDistancePTForPixel(
    col: number,
    row: number,
    orbit: ReferenceOrbit,
    maxIterations: number,
    escapeValue: number,
): number {
    const reDc = (col - orbit.colRef) * orbit.pixelStep;
    const imDc = (row - orbit.rowRef) * -orbit.pixelStep; // y-axis is inverted in canvas space

    let reDz = 0;
    let imDz = 0;
    // Derivative dδz/dδc, initialised to 1 (same as dZ/dc = 1 at n=0)
    let reDeriv = 1;
    let imDeriv = 0;

    for (let n = 0; n < orbit.length; n++) {
        const reRef = orbit.reZ[n];
        const imRef = orbit.imZ[n];

        // δz_{n+1} = 2·Z_ref_n·δz_n + δz_n² + δc
        const reDzNew = 2 * (reRef * reDz - imRef * imDz) + (reDz * reDz - imDz * imDz) + reDc;
        const imDzNew = 2 * (reRef * imDz + imRef * reDz) + 2 * reDz * imDz + imDc;

        // dδz_{n+1}/dδc = 2·(Z_ref_n + δz_n) · dδz_n/dδc + 1
        const reTotal = reRef + reDz;
        const imTotal = imRef + imDz;
        const reDerivNew = 2 * (reTotal * reDeriv - imTotal * imDeriv) + 1;
        const imDerivNew = 2 * (reTotal * imDeriv + imTotal * reDeriv);

        reDz = reDzNew;
        imDz = imDzNew;
        reDeriv = reDerivNew;
        imDeriv = imDerivNew;

        const reZ = orbit.reZ[n + 1] + reDz;
        const imZ = orbit.imZ[n + 1] + imDz;
        const modZ = modulus(reZ, imZ);

        if (modZ >= escapeValue) {
            const modDeriv = modulus(reDeriv, imDeriv);
            return modDeriv > 0 ? (modZ * Math.log(modZ)) / modDeriv : 0;
        }
    }

    return 0; // inside the set
}

function modulus(reZ: number, imZ: number): number {
    return Math.sqrt(reZ * reZ + imZ * imZ);
}
