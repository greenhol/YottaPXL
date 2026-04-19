import { GridReader } from '../../grid/grid-reader';
import { GridWithMargin } from '../../grid/grid-with-margin';
import { GridWithoutRange } from '../../grid/grid-without-range';
import { MessageFromWorker, MessageToWorker } from '../../worker/types';
import { getNoiseScaleFactor, NoiseScaleFactor } from './types';
import { upscaleNoise } from './utils';
import { WorkerSetupGaussianNoise } from './worker-setup-gaussian-noise';

self.onmessage = (e) => {
    let timeStamp = Date.now();
    const { type, data }: { type: MessageFromWorker | MessageToWorker, data: WorkerSetupGaussianNoise; } = e.data;
    if (type === MessageToWorker.START) {
        const scaleFactor = getNoiseScaleFactor(data.scaleFactor);
        const grid = GridWithMargin.copyWithMargin(data.gridBlueprint);
        const baseGrid = (scaleFactor == NoiseScaleFactor.NONE) ? grid : new GridWithoutRange(grid.width, grid.height);
        let result: Float64Array = calculate(baseGrid, data.mean, data.range, data.standardDeviation);
        if (scaleFactor != NoiseScaleFactor.NONE) {
            result = upscaleNoise(baseGrid, result, grid, scaleFactor);
        }
        console.info(`#NoiseGeneratorGaussian (worker) - calculation done in ${(Date.now() - timeStamp) / 1000}s`);
        self.postMessage({ type: MessageFromWorker.RESULT, result }, [result.buffer]);
    }
};

function calculate(grid: GridReader, mean: number, range: number, standardDeviation: number): Float64Array {
    const min = mean - range / 2 * standardDeviation;
    const max = mean + range / 2 * standardDeviation;
    const data = new Float64Array(grid.size);
    for (let row = 0; row < grid.height; row++) {
        for (let col = 0; col < grid.width; col++) {
            let [z0, z1] = boxMullerTransform();
            z0 = z0 * standardDeviation + mean;
            z0 = Math.max(min, Math.min(max, z0));
            z1 = z1 * standardDeviation + mean;
            z1 = Math.max(min, Math.min(max, z1));

            data[grid.getIndex(col, row)] = (z0 - min) / range;
            col++;
            data[grid.getIndex(col, row)] = (z1 - min) / range;
        }
    }
    return data;
}

function boxMullerTransform(): [number, number] {
    let u1 = 0, u2 = 0;
    // Ensure u1 is not 0 to avoid log(0)
    while (u1 === 0) u1 = Math.random();
    while (u2 === 0) u2 = Math.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
    return [z0, z1];
}