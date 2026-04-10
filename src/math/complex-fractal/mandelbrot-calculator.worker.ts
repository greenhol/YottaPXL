import { Grid } from '../../grid/grid';
import { MessageFromWorker, MessageToWorker } from '../../worker/types';
import { CalculationType } from './types';
import { WorkerSetupMandelbrot } from './worker-setup-mandelbrot';

self.onmessage = (e) => {
    const { type, data } = e.data;
    if (type === MessageToWorker.START) {
        let result: Float64Array;
        switch ((data as WorkerSetupMandelbrot).type) {
            case CalculationType.ITERATIONS:
                result = calculateIterations(data);
                break;
            case CalculationType.ITERATIONS_SMOOTH:
                result = calculateSmoothIterations(data);
                break;
            case CalculationType.DISTANCE:
                result = calculateDistances(data);
                break;
        }
        self.postMessage({ type: MessageFromWorker.RESULT, result }, [result.buffer]);
    }
};

function calculateIterations(setup: WorkerSetupMandelbrot): Float64Array {
    const grid = Grid.copy(setup.gridBlueprint);
    let cnt = 0;
    let timeStamp = Date.now();
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
    console.info(`#calculateIterations (worker) - calculation done in ${(Date.now() - timeStamp) / 1000}s`);
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

function calculateSmoothIterations(setup: WorkerSetupMandelbrot): Float64Array {
    const grid = Grid.copy(setup.gridBlueprint);
    let cnt = 0;
    let timeStamp = Date.now();
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
    console.info(`#calculateSmoothIterations (worker) - calculation done in ${(Date.now() - timeStamp) / 1000}s`);
    return targetData;
}

function calculateSmoothIterationForPixel(col: number, row: number, grid: Grid, maxIterations: number, escapeValue: number): number {
    const [reC, imC] = grid.pixelToMath(col, row);
    let reZ = 0;
    let imZ = 0;
    let iteration = 0;
    while (iteration < maxIterations) {
        // z = z^2 + c
        const re_z_squared = reZ * reZ - imZ * imZ;
        const im_z_squared = 2 * reZ * imZ;
        reZ = re_z_squared + reC;
        imZ = im_z_squared + imC;

        const absZ = Math.sqrt(reZ * reZ + imZ * imZ);
        if (absZ > escapeValue) {
            const logZn = Math.log(absZ) / 2;
            const logLogZn = Math.log(logZn) / Math.log(2);
            return iteration + 1 - logLogZn;
        }
        iteration++;
    }
    return 0;
}

function calculateDistances(setup: WorkerSetupMandelbrot): Float64Array {
    const grid = Grid.copy(setup.gridBlueprint);
    let cnt = 0;
    let timeStamp = Date.now();
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
    console.info(`#calculateDistances (worker) - calculation done in ${(Date.now() - timeStamp) / 1000}s`);
    return targetData;
}

function calculateDistanceForPixelOld(col: number, row: number, grid: Grid, maxIterations: number, escapeValue: number): number {
    const [reC, imC] = grid.pixelToMath(col, row);

    let reZ = 0;
    let imZ = 0;
    let reZdiff = 0;
    let imZdiff = 0;
    let iteration = 0;

    while (iteration < maxIterations) {
        // z = z^2 + c
        const re_z_squared = reZ * reZ - imZ * imZ;
        const im_z_squared = 2 * reZ * imZ;
        reZ = re_z_squared + reC;
        imZ = im_z_squared + imC;

        // dz = 2 * z * dz + 1
        const reTemp = 2 * (reZ * reZdiff - imZ * imZdiff) + 1;
        const imTemp = 2 * (reZ * imZdiff + imZ * reZdiff);
        reZdiff = reTemp;
        imZdiff = imTemp;

        const absZ = Math.sqrt(reZ * reZ + imZ * imZ);
        if (absZ > escapeValue) {
            // Distance estimation
            const absDz = Math.sqrt(reZdiff * reZdiff + imZdiff * imZdiff);
            return 2 * (absZ * Math.log(absZ)) / absDz;
        }
        iteration++;
    }
    return 0;
}

function calculateDistanceForPixel(col: number, row: number, grid: Grid, maxIterations: number, escapeValue: number): number {
    const [reC, imC] = grid.pixelToMath(col, row);

    let reZ = 0;
    let imZ = 0;
    let reZdiff = 1;
    let imZdiff = 0;
    let iteration = 0;

    do {
        // z_new = z * z + c
        const reZnew = reZ * reZ - imZ * imZ + reC;
        const imZnew = 2 * reZ * imZ + imC;

        // dz_new = 2 * z * dz + 1
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

function modulus(reZ: number, imZ: number): number {
    return Math.sqrt(reZ * reZ + imZ * imZ);
}
