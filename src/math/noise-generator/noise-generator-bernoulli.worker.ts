import { createDefaultGridRange } from '../../grid/grid-range';
import { GridWithMargin } from '../../grid/grid-with-margin';
import { MessageFromWorker, MessageToWorker } from '../../worker/types';
import { BernoulliNoiseType, NoiseScaleFactor, getNoiseScaleFactor } from './types';

self.onmessage = (e) => {
    const { type, data } = e.data;
    if (type === MessageToWorker.START) {
        const factor = getNoiseScaleFactor(data.scale);
        const grid = GridWithMargin.copyWithMargin(data.gridBlueprint);
        let result: Float64Array;
        if (factor == NoiseScaleFactor.NONE) {
            result = createBernoulliNoise(grid, data.p);
            switch (data.type) {
                case BernoulliNoiseType.ISOLATED:
                    result = createIsolatedNoise(result, grid);
                    break;
                case BernoulliNoiseType.ISOLATED_BIG:
                    result = createIsolatedBigNoise(result, grid);
                    break;
            }
        } else {
            const baseGrid = new GridWithMargin({ width: grid.width, height: grid.height, description: '' }, createDefaultGridRange(), 0);
            let baseNoise: Float64Array = createBernoulliNoise(baseGrid, data.p);
            switch (data.type) {
                case BernoulliNoiseType.ISOLATED:
                    baseNoise = createIsolatedNoise(baseNoise, grid);
                    break;
                case BernoulliNoiseType.ISOLATED_BIG:
                    baseNoise = createIsolatedBigNoise(baseNoise, grid);
                    break;
            }
            result = upscaleNoise(baseGrid, baseNoise, grid, factor);
        }
        self.postMessage({ type: MessageFromWorker.RESULT, result }, [result.buffer]);
    }
};

function upscaleNoise(sourceGrid: GridWithMargin, sourceData: Float64Array, targetGrid: GridWithMargin, scale: number): Float64Array {
    const data = new Float64Array(targetGrid.size);
    for (let baseRow = 0; baseRow < sourceGrid.height; baseRow++) {
        for (let baseCol = 0; baseCol < sourceGrid.width; baseCol++) {
            const value = sourceData[sourceGrid.getIndex(baseCol, baseRow)];
            for (let i = 0; i < scale; i++) {
                for (let j = 0; j < scale; j++) {
                    const row = baseRow * scale + j;
                    const col = baseCol * scale + i;
                    if (row < targetGrid.height && col < targetGrid.width) {
                        data[targetGrid.getIndex(col, row)] = value;
                    }
                }
            }
        }
    }
    return data;
}

function createBernoulliNoise(grid: GridWithMargin, p: number): Float64Array {
    const data = new Float64Array(grid.size);
    for (let row = 0; row < grid.height; row++) {
        for (let col = 0; col < grid.width; col++) {
            data[grid.getIndex(col, row)] = (Math.random() < p) ? 0 : 1;
        }
    }
    return data;
}

function createIsolatedNoise(data: Float64Array, grid: GridWithMargin): Float64Array {
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

function createIsolatedBigNoise(data: Float64Array, grid: GridWithMargin): Float64Array {
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
                    data[grid.getIndex(col - 1, row - 1)] = 0
                }
                if (col > 0) {
                    data[grid.getIndex(col - 1, row)] = 0
                }
                if (row > 0) {
                    data[grid.getIndex(col, row - 1)] = 0
                }
            }
        }
    }
    return data;
}