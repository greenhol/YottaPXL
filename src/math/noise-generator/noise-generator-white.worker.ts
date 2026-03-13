import { GridReader } from '../../grid/grid-reader';
import { GridWithMargin } from '../../grid/grid-with-margin';
import { GridWithoutRange } from '../../grid/grid-without-range';
import { MessageFromWorker, MessageToWorker } from '../../worker/types';
import { getNoiseScaleFactor, NoiseScaleFactor } from './types';
import { upscaleNoise } from './utils';
import { WorkerSetupWhiteNoise } from './worker-setup-white-noise';

self.onmessage = (e) => {
    const { type, data }: { type: MessageFromWorker | MessageToWorker, data: WorkerSetupWhiteNoise } = e.data;
    if (type === MessageToWorker.START) {
        const scaleFactor = getNoiseScaleFactor(data.scaleFactor);
        const grid = GridWithMargin.copyWithMargin(data.gridBlueprint);
        const baseGrid = (scaleFactor == NoiseScaleFactor.NONE) ? grid : new GridWithoutRange(grid.width, grid.height);
        let result: Float64Array = calculate(baseGrid);
        if (scaleFactor != NoiseScaleFactor.NONE) {
            result = upscaleNoise(baseGrid, result, grid, scaleFactor);
        }
        self.postMessage({ type: MessageFromWorker.RESULT, result }, [result.buffer]);
    }
};

function calculate(grid: GridReader): Float64Array {
    const data = new Float64Array(grid.size);
    for (let row = 0; row < grid.height; row++) {
        for (let col = 0; col < grid.width; col++) {
            data[grid.getIndex(col, row)] = Math.random();
        }
    }
    return data;
}