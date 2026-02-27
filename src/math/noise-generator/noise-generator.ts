import { BehaviorSubject, Observable } from 'rxjs';
import { GridWithMargin } from '../../grid/grid-with-margin';
import { CalculationState, MessageFromWorker, MessageToWorker } from '../../worker/types';
import { WorkerSetupBernoulliNoise } from './worker-setup-bernoulli-noise';
import { WorkerSetupBiasedNoise } from './worker-setup-biased-noise';
import { WorkerSetupWhiteNoise } from './worker-setup-white-noise';
import { WorkerSetupGaussianNoise } from './worker-setup-gaussian-noise';
import { BernoulliNoiseType, BiasType } from './types';
import { executeWorker } from '../../worker/execute-worker';

export class NoiseGenerator {

    private _grid: GridWithMargin;

    constructor(grid: GridWithMargin) {
        this._grid = grid;
    }

    public testBiasedDistributions() {
        this.printRandomDistribution('randomBiasedToLower', this.randomBiasedToLower);
        this.printRandomDistribution('randomBiasedToUpper', this.randomBiasedToUpper);
        this.printRandomDistribution('randomBiasedToCenter', this.randomBiasedToCenter);
        this.printRandomDistribution('randomBiasedToBounds', this.randomBiasedToBounds);
        this.printRandomDistribution('randomBiasedToBoundsByCubic', this.randomBiasedToBoundsByCubic);
        this.printRandomDistribution('randomBiasedToBoundsByQuintic', this.randomBiasedToBoundsByQuintic);
        this.printRandomDistribution('randomBiasedToBoundsBySeptic', this.randomBiasedToBoundsBySeptic);
        this.printRandomDistribution('randomBiasedToBoundsByTrig', this.randomBiasedToBoundsByTrig);
    }

    /** @deprecated Use createWhiteNoise instead */
    public createWhiteNoiseSync(): Float64Array {
        const data = new Float64Array(this._grid.size);
        for (let row = 0; row < this._grid.height; row++) {
            for (let col = 0; col < this._grid.width; col++) {
                data[this._grid.getIndex(col, row)] = Math.random();
            }
        }
        return data;
    }

    public createWhiteNoise(): Observable<CalculationState<Float64Array>> {
        const worker = new Worker(new URL('./noise-generator-white.worker.ts', import.meta.url));
        const setup: WorkerSetupWhiteNoise = {
            gridBlueprint: this._grid.withMarginBlueprint,
        }
        return executeWorker<WorkerSetupWhiteNoise, Float64Array>(worker, setup);
    }

    /** @deprecated Use createBernoulliNoise instead */
    public createBernoulliNoiseSync(p: number = 0.5): Float64Array {
        const data = new Float64Array(this._grid.size);
        for (let row = 0; row < this._grid.height; row++) {
            for (let col = 0; col < this._grid.width; col++) {
                data[this._grid.getIndex(col, row)] = (Math.random() < p) ? 0 : 1;
            }
        }
        return data;
    }

    /** @deprecated Use createBernoulliNoiseIsolated instead */
    public createIsolatedBlackNoiseSync(p: number = 0.5): Float64Array {
        const data = this.createBernoulliNoiseSync(p);
        for (let row = 0; row < this._grid.height; row++) {
            for (let col = 0; col < this._grid.width; col++) {
                if (data[this._grid.getIndex(col, row)] == 0) {
                    if (col > 0) {
                        if (data[this._grid.getIndex(col - 1, row)] == 0) {
                            data[this._grid.getIndex(col, row)] = 1;
                            continue;
                        }
                    }
                    const adjacentRow = row - 1;
                    for (let i = -1; i <= 1; i++) {
                        const adjacentCol = col + i;
                        if (adjacentRow >= 0 && adjacentCol >= 0 && adjacentCol < this._grid.width) {
                            if (data[this._grid.getIndex(adjacentCol, adjacentRow)] == 0) {
                                data[this._grid.getIndex(col, row)] = 1;
                                continue;
                            }
                        }
                    }
                }
            }
        }
        return data;
    }

    /** @deprecated Use createBernoulliNoiseIsolatedBig instead */
    public createIsolatedBigBlackNoiseSync(p: number = 0.5): Float64Array {
        const data = this.createBernoulliNoiseSync(p);
        for (let row = 0; row < this._grid.height; row++) {
            for (let col = 0; col < this._grid.width; col++) {
                if (data[this._grid.getIndex(col, row)] == 0) {
                    if (col > 0) {
                        if (data[this._grid.getIndex(col - 1, row)] == 0) {
                            data[this._grid.getIndex(col, row)] = 1;
                            continue;
                        }
                    }
                    if (col > 1) {
                        if (data[this._grid.getIndex(col - 2, row)] == 0) {
                            data[this._grid.getIndex(col, row)] = 1;
                            continue;
                        }
                    }
                    let adjacentRow = row - 2;
                    for (let i = -2; i <= 2; i++) {
                        const adjacentCol = col + i;
                        if (adjacentRow >= 0 && adjacentCol >= 0 && adjacentCol < this._grid.width) {
                            if (data[this._grid.getIndex(adjacentCol, adjacentRow)] == 0) {
                                data[this._grid.getIndex(col, row)] = 1;
                                continue;
                            }
                        }
                    }
                    adjacentRow = row - 1;
                    for (let i = -2; i <= 2; i++) {
                        const adjacentCol = col + i;
                        if (adjacentRow >= 0 && adjacentCol >= 0 && adjacentCol < this._grid.width) {
                            if (data[this._grid.getIndex(adjacentCol, adjacentRow)] == 0) {
                                data[this._grid.getIndex(col, row)] = 1;
                                continue;
                            }
                        }
                    }
                }
            }
        }
        for (let row = 0; row < this._grid.height; row++) {
            for (let col = 0; col < this._grid.width; col++) {
                if (data[this._grid.getIndex(col, row)] == 0) {
                    if (row > 0 && col > 0) {
                        data[this._grid.getIndex(col - 1, row - 1)] = 0
                    }
                    if (col > 0) {
                        data[this._grid.getIndex(col - 1, row)] = 0
                    }
                    if (row > 0) {
                        data[this._grid.getIndex(col, row - 1)] = 0
                    }
                }
            }
        }
        return data;
    }

    public createBernoulliNoise(p: number = 0.5): Observable<CalculationState<Float64Array>> {
        return this.createBernoulliNoiseOfType(BernoulliNoiseType.DEFAULT, p);
    }

    public createBernoulliNoiseIsolated(p: number = 0.5): Observable<CalculationState<Float64Array>> {
        return this.createBernoulliNoiseOfType(BernoulliNoiseType.ISOLATED, p);
    }

    public createBernoulliNoiseIsolatedBig(p: number = 0.5): Observable<CalculationState<Float64Array>> {
        return this.createBernoulliNoiseOfType(BernoulliNoiseType.ISOLATED_BIG, p);
    }

    private createBernoulliNoiseOfType(type: BernoulliNoiseType, p: number = 0.5): Observable<CalculationState<Float64Array>> {
        const worker = new Worker(new URL('./noise-generator-bernoulli.worker.ts', import.meta.url));
        const setup: WorkerSetupBernoulliNoise = {
            type: type,
            gridBlueprint: this._grid.withMarginBlueprint,
            p: p,
        }
        return executeWorker<WorkerSetupBernoulliNoise, Float64Array>(worker, setup);
    }

    /** @deprecated Use createBiasedNoise instead */
    public createBiasedNoiseSync(type: BiasType): Float64Array {
        const data = new Float64Array(this._grid.size);
        let biasFunction: () => number;
        switch (type) {
            case BiasType.LOWER: biasFunction = this.randomBiasedToLower; break;
            case BiasType.UPPER: biasFunction = this.randomBiasedToUpper; break;
            case BiasType.CENTER: biasFunction = this.randomBiasedToCenter; break;
            case BiasType.BOUNDS: biasFunction = this.randomBiasedToBounds; break;
            case BiasType.BOUNDS_BY_CUBIC: biasFunction = this.randomBiasedToBoundsByCubic; break;
            case BiasType.BOUNDS_BY_QUINTIC: biasFunction = this.randomBiasedToBoundsByQuintic; break;
            case BiasType.BOUNDS_BY_SEPTIC: biasFunction = this.randomBiasedToBoundsBySeptic; break;
            case BiasType.BOUNDS_BY_TRIG: biasFunction = this.randomBiasedToBoundsByTrig; break;
        }

        for (let row = 0; row < this._grid.height; row++) {
            for (let col = 0; col < this._grid.width; col++) {
                data[this._grid.getIndex(col, row)] = biasFunction();
            }
        }
        return data;
    }

    public createBiasedNoise(type: BiasType): Observable<CalculationState<Float64Array>> {
        const worker = new Worker(new URL('./noise-generator-biased.worker.ts', import.meta.url));
        const setup: WorkerSetupBiasedNoise = {
            type: type,
            gridBlueprint: this._grid.withMarginBlueprint,
        }
        return executeWorker<WorkerSetupBiasedNoise, Float64Array>(worker, setup);
    }

    /** @deprecated Use createGaussianNoise instead */
    public createGaussianNoiseSync(mean: number = 0, standardDeviation: number = 1, range: number = 6): Float64Array {
        const min = mean - range / 2 * standardDeviation;
        const max = mean + range / 2 * standardDeviation;

        const data = new Float64Array(this._grid.size);
        for (let row = 0; row < this._grid.height; row++) {
            for (let col = 0; col < this._grid.width; col++) {
                let [z0, z1] = this.boxMullerTransform();
                z0 = z0 * standardDeviation + mean;
                z0 = Math.max(min, Math.min(max, z0));
                z1 = z1 * standardDeviation + mean;
                z1 = Math.max(min, Math.min(max, z1));

                data[this._grid.getIndex(col, row)] = (z0 - min) / range;
                col++;
                data[this._grid.getIndex(col, row)] = (z1 - min) / range;
            }
        }
        return data;
    }

    public createGaussianNoise(mean: number = 0, standardDeviation: number = 1, range: number = 6): Observable<CalculationState<Float64Array>> {
        const worker = new Worker(new URL('./noise-generator-gaussian.worker.ts', import.meta.url));
        const setup: WorkerSetupGaussianNoise = {
            gridBlueprint: this._grid.withMarginBlueprint,
            mean: mean,
            standardDeviation: standardDeviation,
            range: range,
        }
        return executeWorker<WorkerSetupGaussianNoise, Float64Array>(worker, setup);
    }

    private randomBiasedToLower(): number {
        return 1 - Math.sqrt(1 - Math.pow(Math.random(), 2));
    }

    private randomBiasedToUpper(): number {
        return Math.sqrt(1 - Math.pow(Math.random() - 1, 2));
    }

    private randomBiasedToCenter(): number {
        const x = Math.random();
        return x <= 0.5
            ? Math.sqrt(1 - Math.pow(2 * x - 1, 2)) / 2
            : 1 - Math.sqrt(1 - Math.pow(2 * x - 1, 2)) / 2;
    }

    private randomBiasedToBounds(): number {
        const x = Math.random();
        return x <= 0.5
            ? 0.5 - Math.sqrt(1 - Math.pow(2 * x, 2)) / 2
            : 0.5 + Math.sqrt(1 - Math.pow(2 * x - 2, 2)) / 2;
    }

    private randomBiasedToBoundsByCubic(): number {
        const x = Math.random();
        return -2 * Math.pow(x, 3) + 3 * Math.pow(x, 2);
    }

    private randomBiasedToBoundsByQuintic(): number {
        const x = Math.random();
        return 6 * Math.pow(x, 5) - 15 * Math.pow(x, 4) + 10 * Math.pow(x, 3);
    }

    private randomBiasedToBoundsBySeptic(): number {
        const x = Math.random();
        return -20 * Math.pow(x, 7) + 70 * Math.pow(x, 6) - 84 * Math.pow(x, 5) + 35 * Math.pow(x, 4);
    }

    private randomBiasedToBoundsByTrig(): number {
        return (1 - Math.cos(Math.random() * Math.PI)) / 2;
    }

    private boxMullerTransform(): [number, number] {
        let u1 = 0, u2 = 0;
        // Ensure u1 is not 0 to avoid log(0)
        while (u1 === 0) u1 = Math.random();
        while (u2 === 0) u2 = Math.random();
        const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
        return [z0, z1];
    }

    private printRandomDistribution(name: string, randomFunction: () => number) {
        const counts: Record<string, number> = {
            "0.0-0.1": 0, "0.1-0.2": 0, "0.2-0.3": 0, "0.3-0.4": 0, "0.4-0.5": 0,
            "0.5-0.6": 0, "0.6-0.7": 0, "0.7-0.8": 0, "0.8-0.9": 0, "0.9-1.0": 0
        };
        const totalSamples = 5000; // Use more samples for smoother results

        for (let i = 0; i < totalSamples; i++) {
            const val = randomFunction();
            if (val < 0.1) counts["0.0-0.1"]++;
            else if (val < 0.2) counts["0.1-0.2"]++;
            else if (val < 0.3) counts["0.2-0.3"]++;
            else if (val < 0.4) counts["0.3-0.4"]++;
            else if (val < 0.5) counts["0.4-0.5"]++;
            else if (val < 0.6) counts["0.5-0.6"]++;
            else if (val < 0.7) counts["0.6-0.7"]++;
            else if (val < 0.8) counts["0.7-0.8"]++;
            else if (val < 0.9) counts["0.8-0.9"]++;
            else counts["0.9-1.0"]++;
        }
        console.log(name, counts);
    }
}