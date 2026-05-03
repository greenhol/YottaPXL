import { GridReader } from '../../grid/grid-reader';
import { GridWithMargin } from '../../grid/grid-with-margin';
import { GridWithoutRange } from '../../grid/grid-without-range';
import { MessageFromWorker, MessageToWorker } from '../../worker/types';
import { BernoulliNoiseType } from './types';
import { upscaleNoise } from './utils';
import { WorkerSetupBernoulliNoise } from './worker-setup-bernoulli-noise';

self.onmessage = (e) => {
    let timeStamp = Date.now();
    const { type, data }: { type: MessageFromWorker | MessageToWorker, data: WorkerSetupBernoulliNoise; } = e.data;
    if (type === MessageToWorker.START) {
        const grid = GridWithMargin.copyWithMargin(data.gridBlueprint);
        const baseGrid = (data.scaleFactor == 1) ? grid : new GridWithoutRange(grid.width, grid.height);
        let result: Float64Array = createBernoulliNoise(baseGrid, data.p);
        switch (data.type) {
            case BernoulliNoiseType.ISOLATED:
                result = createIsolatedNoise(result, baseGrid);
                break;
            case BernoulliNoiseType.ISOLATED_BIG:
                result = createIsolatedBigNoise(result, baseGrid);
                break;
        }
        result = upscaleNoise(baseGrid, result, grid, data.scaleFactor);
        console.info(`#NoiseGeneratorBernoulli (worker) - calculation for ${data.type} done in ${(Date.now() - timeStamp) / 1000}s`);
        self.postMessage({ type: MessageFromWorker.RESULT, result }, [result.buffer]);
    }
};

function createBernoulliNoise(grid: GridReader, p: number): Float64Array {
    const data = new Float64Array(grid.size);
    for (let row = 0; row < grid.height; row++) {
        for (let col = 0; col < grid.width; col++) {
            data[grid.getIndex(col, row)] = (Math.random() < p) ? 0 : 1;
        }
    }
    return data;
}

function createIsolatedNoise(data: Float64Array, grid: GridReader): Float64Array {
    for (let row = 0; row < grid.height; row++) {
        for (let col = 0; col < grid.width; col++) {
            if (data[grid.getIndex(col, row)] == 0) {
                if (col > 0) {
                    if (data[grid.getIndex(col - 1, row)] == 0) {
                        data[grid.getIndex(col, row)] = 1;
                        continue;
                    }
                }
                const adjacentRow = row - 1;
                for (let i = -1; i <= 1; i++) {
                    const adjacentCol = col + i;
                    if (adjacentRow >= 0 && adjacentCol >= 0 && adjacentCol < grid.width) {
                        if (data[grid.getIndex(adjacentCol, adjacentRow)] == 0) {
                            data[grid.getIndex(col, row)] = 1;
                            continue;
                        }
                    }
                }
            }
        }
    }
    return data;
}

function createIsolatedBigNoise(data: Float64Array, grid: GridReader): Float64Array {
    for (let row = 0; row < grid.height; row++) {
        for (let col = 0; col < grid.width; col++) {
            if (data[grid.getIndex(col, row)] == 0) {
                if (col > 0) {
                    if (data[grid.getIndex(col - 1, row)] == 0) {
                        data[grid.getIndex(col, row)] = 1;
                        continue;
                    }
                }
                if (col > 1) {
                    if (data[grid.getIndex(col - 2, row)] == 0) {
                        data[grid.getIndex(col, row)] = 1;
                        continue;
                    }
                }
                let adjacentRow = row - 2;
                for (let i = -2; i <= 2; i++) {
                    const adjacentCol = col + i;
                    if (adjacentRow >= 0 && adjacentCol >= 0 && adjacentCol < grid.width) {
                        if (data[grid.getIndex(adjacentCol, adjacentRow)] == 0) {
                            data[grid.getIndex(col, row)] = 1;
                            continue;
                        }
                    }
                }
                adjacentRow = row - 1;
                for (let i = -2; i <= 2; i++) {
                    const adjacentCol = col + i;
                    if (adjacentRow >= 0 && adjacentCol >= 0 && adjacentCol < grid.width) {
                        if (data[grid.getIndex(adjacentCol, adjacentRow)] == 0) {
                            data[grid.getIndex(col, row)] = 1;
                            continue;
                        }
                    }
                }
            }
        }
    }
    for (let row = 0; row < grid.height; row++) {
        for (let col = 0; col < grid.width; col++) {
            if (data[grid.getIndex(col, row)] == 0) {
                if (row > 0 && col > 0) {
                    data[grid.getIndex(col - 1, row - 1)] = 0;
                }
                if (col > 0) {
                    data[grid.getIndex(col - 1, row)] = 0;
                }
                if (row > 0) {
                    data[grid.getIndex(col, row - 1)] = 0;
                }
            }
        }
    }
    return data;
}