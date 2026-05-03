import { GridReader } from '../../grid/grid-reader';
import { GridWithMargin } from '../../grid/grid-with-margin';
import { GridWithoutRange } from '../../grid/grid-without-range';
import { MessageFromWorker, MessageToWorker } from '../../worker/types';
import { BiasType } from './types';
import { upscaleNoise } from './utils';
import { WorkerSetupBiasedNoise } from './worker-setup-biased-noise';

self.onmessage = (e) => {
    let timeStamp = Date.now();
    const { type, data }: { type: MessageFromWorker | MessageToWorker, data: WorkerSetupBiasedNoise; } = e.data;
    if (type === MessageToWorker.START) {
        const grid = GridWithMargin.copyWithMargin(data.gridBlueprint);
        const baseGrid = (data.scaleFactor == 1) ? grid : new GridWithoutRange(grid.width, grid.height);
        let result: Float64Array = calculate(baseGrid, data.type);
        result = upscaleNoise(baseGrid, result, grid, data.scaleFactor);
        console.info(`#NoiseGeneratorBiased (worker) - calculation for ${data.type} done in ${(Date.now() - timeStamp) / 1000}s`);
        self.postMessage({ type: MessageFromWorker.RESULT, result }, [result.buffer]);
    }
};

function calculate(grid: GridReader, type: BiasType): Float64Array {
    const data = new Float64Array(grid.size);
    let biasFunction: () => number;
    switch (type) {
        case BiasType.LOWER: biasFunction = randomBiasedToLower; break;
        case BiasType.UPPER: biasFunction = randomBiasedToUpper; break;
        case BiasType.CENTER: biasFunction = randomBiasedToCenter; break;
        case BiasType.BOUNDS: biasFunction = randomBiasedToBounds; break;
        case BiasType.BOUNDS_BY_CUBIC: biasFunction = randomBiasedToBoundsByCubic; break;
        case BiasType.BOUNDS_BY_QUINTIC: biasFunction = randomBiasedToBoundsByQuintic; break;
        case BiasType.BOUNDS_BY_SEPTIC: biasFunction = randomBiasedToBoundsBySeptic; break;
        case BiasType.BOUNDS_BY_TRIG: biasFunction = randomBiasedToBoundsByTrig; break;
    }

    for (let row = 0; row < grid.height; row++) {
        for (let col = 0; col < grid.width; col++) {
            data[grid.getIndex(col, row)] = biasFunction();
        }
    }
    return data;
}

function randomBiasedToLower(): number {
    return 1 - Math.sqrt(1 - Math.pow(Math.random(), 2));
}

function randomBiasedToUpper(): number {
    return Math.sqrt(1 - Math.pow(Math.random() - 1, 2));
}

function randomBiasedToCenter(): number {
    const x = Math.random();
    return x <= 0.5
        ? Math.sqrt(1 - Math.pow(2 * x - 1, 2)) / 2
        : 1 - Math.sqrt(1 - Math.pow(2 * x - 1, 2)) / 2;
}

function randomBiasedToBounds(): number {
    const x = Math.random();
    return x <= 0.5
        ? 0.5 - Math.sqrt(1 - Math.pow(2 * x, 2)) / 2
        : 0.5 + Math.sqrt(1 - Math.pow(2 * x - 2, 2)) / 2;
}

function randomBiasedToBoundsByCubic(): number {
    const x = Math.random();
    return -2 * Math.pow(x, 3) + 3 * Math.pow(x, 2);
}

function randomBiasedToBoundsByQuintic(): number {
    const x = Math.random();
    return 6 * Math.pow(x, 5) - 15 * Math.pow(x, 4) + 10 * Math.pow(x, 3);
}

function randomBiasedToBoundsBySeptic(): number {
    const x = Math.random();
    return -20 * Math.pow(x, 7) + 70 * Math.pow(x, 6) - 84 * Math.pow(x, 5) + 35 * Math.pow(x, 4);
}

function randomBiasedToBoundsByTrig(): number {
    return (1 - Math.cos(Math.random() * Math.PI)) / 2;
}
