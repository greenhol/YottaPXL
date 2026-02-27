import { GridWithMargin } from '../../grid/grid-with-margin';
import { MessageFromWorker, MessageToWorker } from '../../worker/types';
import { WorkerSetupGaussianNoise } from './worker-setup-gaussian-noise';

self.onmessage = (e) => {
    const { type, data } = e.data;
    if (type === MessageToWorker.START) {
        const result = calculate(data);
        self.postMessage({ type: MessageFromWorker.RESULT, result }, [result.buffer]);
    }
};

function calculate(setup: WorkerSetupGaussianNoise): Float64Array {
    const grid = GridWithMargin.copyWithMargin(setup.gridBlueprint);
    const min = setup.mean - setup.range / 2 * setup.standardDeviation;
    const max = setup.mean + setup.range / 2 * setup.standardDeviation;
    const data = new Float64Array(grid.size);
    for (let row = 0; row < grid.height; row++) {
        for (let col = 0; col < grid.width; col++) {
            let [z0, z1] = boxMullerTransform();
            z0 = z0 * setup.standardDeviation + setup.mean;
            z0 = Math.max(min, Math.min(max, z0));
            z1 = z1 * setup.standardDeviation + setup.mean;
            z1 = Math.max(min, Math.min(max, z1));

            data[grid.getIndex(col, row)] = (z0 - min) / setup.range;
            col++;
            data[grid.getIndex(col, row)] = (z1 - min) / setup.range;
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