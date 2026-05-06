import { GridReader } from '../../grid/grid-reader';
import { GridWithMargin } from '../../grid/grid-with-margin';
import { GridWithoutRange } from '../../grid/grid-without-range';
import { MessageFromWorker, MessageToWorker } from '../../worker/types';
import { upscaleNoise } from './upscale-noise';
import { WorkerSetupWhiteNoise } from './worker-setup-white-noise';

self.onmessage = (e) => {
    let timeStamp = Date.now();
    const { type, data }: { type: MessageFromWorker | MessageToWorker, data: WorkerSetupWhiteNoise; } = e.data;
    if (type === MessageToWorker.START) {
        const grid = GridWithMargin.copyWithMargin(data.gridBlueprint);
        const baseGrid = (data.scaleFactor == 1) ? grid : new GridWithoutRange(grid.width, grid.height);
        let result: Float32Array = calculate(baseGrid);
        result = upscaleNoise(baseGrid, result, grid, data.scaleFactor);
        console.info(`#NoiseGeneratorWhite (worker) - calculation done in ${(Date.now() - timeStamp) / 1000}s`);
        self.postMessage({ type: MessageFromWorker.RESULT, result }, [result.buffer]);
    }
};

function calculate(grid: GridReader): Float32Array {
    const data = new Float32Array(grid.size);
    for (let row = 0; row < grid.height; row++) {
        for (let col = 0; col < grid.width; col++) {
            data[grid.getIndex(col, row)] = Math.random();
        }
    }
    return data;
}