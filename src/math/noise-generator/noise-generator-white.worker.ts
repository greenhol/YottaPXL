import { GridWithMargin } from '../../grid/grid-with-margin';
import { MessageFromWorker, MessageToWorker } from '../../worker/types';
import { WorkerSetupWhiteNoise } from './worker-setup-white-noise';

self.onmessage = (e) => {
    const { type, data } = e.data;
    if (type === MessageToWorker.START) {
        const result = calculate(data);
        self.postMessage({ type: MessageFromWorker.RESULT, result }, [result.buffer]);
    }
};

function calculate(setup: WorkerSetupWhiteNoise): Float64Array {
    const grid = GridWithMargin.copyWithMargin(setup.gridBlueprint);
    const data = new Float64Array(grid.size);
    for (let row = 0; row < grid.height; row++) {
        for (let col = 0; col < grid.width; col++) {
            data[grid.getIndex(col, row)] = Math.random();
        }
    }
    return data;
}