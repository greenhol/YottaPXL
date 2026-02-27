import { GridWithMargin } from '../../grid/grid-with-margin';
import { MessageFromWorker, MessageToWorker } from '../../worker/types';
import { BernoulliNoiseType } from './types';

self.onmessage = (e) => {
    const { type, data } = e.data;
    if (type === MessageToWorker.START) {
        const grid = GridWithMargin.copyWithMargin(data.gridBlueprint);
        let result = createBernoulliNoise(grid, data.p);
        switch (data.type) {
            case BernoulliNoiseType.ISOLATED:
                result = createIsolatedNoise(result, grid);
                break;
            case BernoulliNoiseType.ISOLATED_BIG:
                result = createIsolatedBigNoise(result, grid);
                break;
        }
        self.postMessage({ type: MessageFromWorker.RESULT, result }, [result.buffer]);
    }
};

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