import { Observable } from 'rxjs';
import { GridWithMargin } from '../../grid/grid-with-margin';
import { executeWorker } from '../../worker/execute-worker';
import { CalculationState } from '../../worker/types';
import { BernoulliNoiseType, BiasType, NoiseScaleFactor } from './types';
import { WorkerSetupBernoulliNoise } from './worker-setup-bernoulli-noise';
import { WorkerSetupBiasedNoise } from './worker-setup-biased-noise';
import { WorkerSetupGaussianNoise } from './worker-setup-gaussian-noise';
import { WorkerSetupWhiteNoise } from './worker-setup-white-noise';

export class NoiseGenerator {

    private _grid: GridWithMargin;

    constructor(grid: GridWithMargin) {
        this._grid = grid;
    }

    public createWhiteNoise(): Observable<CalculationState<Float64Array>> {
        const worker = new Worker(new URL('./noise-generator-white.worker.ts', import.meta.url));
        const setup: WorkerSetupWhiteNoise = {
            gridBlueprint: this._grid.withMarginBlueprint,
        }
        return executeWorker<WorkerSetupWhiteNoise, Float64Array>(worker, setup);
    }

    public createBernoulliNoise(p: number = 0.5, factor: NoiseScaleFactor = NoiseScaleFactor.NONE): Observable<CalculationState<Float64Array>> {
        return this.createBernoulliNoiseOfType(BernoulliNoiseType.DEFAULT, p, factor);
    }

    public createBernoulliNoiseIsolated(p: number = 0.5, factor: NoiseScaleFactor = NoiseScaleFactor.NONE): Observable<CalculationState<Float64Array>> {
        return this.createBernoulliNoiseOfType(BernoulliNoiseType.ISOLATED, p, factor);
    }

    public createBernoulliNoiseIsolatedBig(p: number = 0.5, factor: NoiseScaleFactor = NoiseScaleFactor.NONE): Observable<CalculationState<Float64Array>> {
        return this.createBernoulliNoiseOfType(BernoulliNoiseType.ISOLATED_BIG, p, factor);
    }

    private createBernoulliNoiseOfType(type: BernoulliNoiseType, p: number = 0.5, scale: number): Observable<CalculationState<Float64Array>> {
        const worker = new Worker(new URL('./noise-generator-bernoulli.worker.ts', import.meta.url));
        const setup: WorkerSetupBernoulliNoise = {
            type: type,
            gridBlueprint: this._grid.withMarginBlueprint,
            p: p,
            scale: scale,
        }
        return executeWorker<WorkerSetupBernoulliNoise, Float64Array>(worker, setup);
    }

    public createBiasedNoise(type: BiasType): Observable<CalculationState<Float64Array>> {
        const worker = new Worker(new URL('./noise-generator-biased.worker.ts', import.meta.url));
        const setup: WorkerSetupBiasedNoise = {
            type: type,
            gridBlueprint: this._grid.withMarginBlueprint,
        }
        return executeWorker<WorkerSetupBiasedNoise, Float64Array>(worker, setup);
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
}