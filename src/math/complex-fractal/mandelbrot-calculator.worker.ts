import { Grid } from '../../grid/grid';
import { MessageFromWorker, MessageToWorker } from '../../worker/types';
import { CalculationType } from './types';
import { WorkerSetupMandelbrot } from './worker-setup-mandelbrot';

self.onmessage = (e) => {
    const { type, data } = e.data;
    if (type === MessageToWorker.START) {
        const result = calculate(data);
        self.postMessage({ type: MessageFromWorker.RESULT, result }, [result.buffer]);
    }
};

function calculate(setup: WorkerSetupMandelbrot): Float64Array {
    const grid = Grid.copy(setup.gridBlueprint);
    let cnt = 0;

    const pixelCalculator = (setup.type === CalculationType.DISTANCE) ? calculateDistanceForPixel : calculateIterationsForPixel;

    let timeStamp = Date.now();
    const targetData = new Float64Array(grid.size);
    for (let row = 0; row < grid.height; row++) {
        for (let col = 0; col < grid.width; col++) {
            targetData[grid.getIndex(col, row)] = pixelCalculator(col, row, grid, setup.maxIterations, setup.escapeValue);
        }
        cnt += grid.width;
        if (cnt > 50000) {
            const progress = Math.round(100 * (row * grid.width) / grid.size);
            self.postMessage({ type: MessageFromWorker.UPDATE, progress });
            cnt = 0;
        }
    }
    console.info('#calculateIterations (worker) - calculation done in ' + (Date.now() - timeStamp) / 1000 + 's');
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

function calculateDistanceForPixel(col: number, row: number, grid: Grid, maxIterations: number, escapeValue: number): number {
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
