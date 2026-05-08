import { XoRng } from '../../../shared/xo-rng';
import { GridReader } from '../../grid/grid-reader';
import { GridWithMargin } from '../../grid/grid-with-margin';
import { GridWithoutRange } from '../../grid/grid-without-range';
import { MessageFromWorker, MessageToWorker } from '../../worker/types';
import { BiasType } from './types';
import { upscaleNoise } from './upscale-noise';
import { WorkerSetupBiasedNoise } from './worker-setup-biased-noise';

self.onmessage = (e) => {
    let timeStamp = Date.now();
    const { type, data }: { type: MessageFromWorker | MessageToWorker, data: WorkerSetupBiasedNoise; } = e.data;
    if (type === MessageToWorker.START) {
        const grid = GridWithMargin.copyWithMargin(data.gridBlueprint);
        const baseGrid = (data.scaleFactor == 1) ? grid : new GridWithoutRange(grid.width, grid.height);
        let result: Float32Array = calculate(baseGrid, new XoRng(data.seed), data.type);
        result = upscaleNoise(baseGrid, result, grid, data.scaleFactor);
        console.info(`#NoiseGeneratorBiased (worker) - calculation for ${data.type} done in ${(Date.now() - timeStamp) / 1000}s`);
        self.postMessage({ type: MessageFromWorker.RESULT, result }, [result.buffer]);
    }
};

function calculate(grid: GridReader, rng: XoRng, type: BiasType): Float32Array {
    const data = new Float32Array(grid.size);
    let biasFunction: (rng: XoRng) => number;
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
            data[grid.getIndex(col, row)] = biasFunction(rng);
        }
    }
    return data;
}

function randomBiasedToLower(rng: XoRng): number {
    return 1 - Math.sqrt(1 - Math.pow(rng.next(), 2));
}

function randomBiasedToUpper(rng: XoRng): number {
    return Math.sqrt(1 - Math.pow(rng.next() - 1, 2));
}

function randomBiasedToCenter(rng: XoRng): number {
    const x = rng.next();
    return x <= 0.5
        ? Math.sqrt(1 - Math.pow(2 * x - 1, 2)) / 2
        : 1 - Math.sqrt(1 - Math.pow(2 * x - 1, 2)) / 2;
}

function randomBiasedToBounds(rng: XoRng): number {
    const x = rng.next();
    return x <= 0.5
        ? 0.5 - Math.sqrt(1 - Math.pow(2 * x, 2)) / 2
        : 0.5 + Math.sqrt(1 - Math.pow(2 * x - 2, 2)) / 2;
}

function randomBiasedToBoundsByCubic(rng: XoRng): number {
    const x = rng.next();
    return -2 * Math.pow(x, 3) + 3 * Math.pow(x, 2);
}

function randomBiasedToBoundsByQuintic(rng: XoRng): number {
    const x = rng.next();
    return 6 * Math.pow(x, 5) - 15 * Math.pow(x, 4) + 10 * Math.pow(x, 3);
}

function randomBiasedToBoundsBySeptic(rng: XoRng): number {
    const x = rng.next();
    return -20 * Math.pow(x, 7) + 70 * Math.pow(x, 6) - 84 * Math.pow(x, 5) + 35 * Math.pow(x, 4);
}

function randomBiasedToBoundsByTrig(rng: XoRng): number {
    return (1 - Math.cos(rng.next() * Math.PI)) / 2;
}
