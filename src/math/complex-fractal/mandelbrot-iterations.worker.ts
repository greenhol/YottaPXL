import { Grid, gridCopy } from '../../grid/grid';
import { MessageFromWorker, MessageToWorker } from '../../worker/types';
import { CalculationSetup } from './types';

function calculateIterations(setup: CalculationSetup): Float64Array {
    const grid = gridCopy(setup.gridBlueprint);
    const escapeValueSquared = setup.escapeValue * setup.escapeValue;
    let cnt = 0;

    let timeStamp = Date.now();
    const targetData = new Float64Array(grid.size);
    for (let row = 0; row < grid.height; row++) {
        for (let col = 0; col < grid.width; col++) {
            targetData[grid.getIndex(col, row)] = calculateIterationsForPixel(col, row, grid, setup.maxIterations, escapeValueSquared);
        }
        cnt += grid.width;
        if (cnt > 50000) {
            const progress = Math.round(100 * (row * grid.width) / grid.size);
            self.postMessage({ type: MessageFromWorker.UPDATE, progress});
            cnt = 0;
        }
    }
    console.info('#calculateIterations (worker) - calculation done in ' + (Date.now() - timeStamp) / 1000 + 's');
    return targetData;
}

function calculateIterationsForPixel(col: number, row: number, grid: Grid, maxIterations: number, escapeValueSquared: number): number {
    const [reC, imC] = grid.pixelToMath(col, row);
    let reZ = 0;
    let imZ = 0;
    let iteration = 0;
    while (reZ * reZ + imZ * imZ < escapeValueSquared && iteration < maxIterations) {
        const xTemp = reZ * reZ - imZ * imZ + reC;
        imZ = 2 * reZ * imZ + imC;
        reZ = xTemp;
        iteration++;
    }
    return iteration;
}

self.onmessage = (e) => {
    const { type, data } = e.data;
    if (type === MessageToWorker.START) {
        const result = calculateIterations(data);
        self.postMessage({ type: MessageFromWorker.RESULT, result });
    }
};
