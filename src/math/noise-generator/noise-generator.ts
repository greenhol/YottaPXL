import { Observable } from 'rxjs';
import { GridWithMargin } from '../../grid/grid-with-margin';
import { executeWorker } from '../../worker/execute-worker';
import { CalculationState } from '../../worker/types';
import { BernoulliNoiseType, BiasType } from './types';
import { WorkerSetupBernoulliNoise } from './worker-setup-bernoulli-noise';
import { WorkerSetupBiasedNoise } from './worker-setup-biased-noise';
import { WorkerSetupGaussianNoise } from './worker-setup-gaussian-noise';
import { WorkerSetupWhiteNoise } from './worker-setup-white-noise';

export enum NoiseType {
    WHITE = 'White Noise',
    BERNOULLI = 'Bernoulli Noise',
    BERNOULLI_ISOLATED = 'Bernoulli Noise Isolated',
    BERNOULLI_ISOLATED_BIG = 'Bernoulli Noise Isolated Big',
    BERNOULLI_ISOLATED_ROUND = 'Bernoulli Noise Isolated Round',
    GAUSSIAN = 'Gaussian Noise',
    BIASED_LOWER = 'Biased Lower',
    BIASED_UPPER = 'Biased Upper',
    BIASED_CENTER = 'Biased Center',
    BIASED_BOUNDS = 'Biased Bounds',
    BIASED_BOUNDS_CUBIC = 'Biased Bounds Cubic',
    BIASED_BOUNDS_QUINTIC = 'Biased Bounds Quintic',
    BIASED_BOUNDS_SEPTIC = 'Biased Bounds Septic',
    BIASED_BOUNDS_TRIG = 'Biased Bounds Trigonometric',
}

export interface NoiseConfig {
    seed: number | null,
    type: NoiseType,
    p: number,
    scaling: number,
}

export class NoiseGenerator {

    private _grid: GridWithMargin;

    constructor(grid: GridWithMargin) {
        this._grid = grid;
    }

    public createNoise(config: NoiseConfig): Observable<CalculationState<Float32Array>> {
        console.info(`#createNoise - type=${config.type}, scaling=${config.scaling}, (p=${config.p})`);
        switch (config.type) {
            case NoiseType.WHITE: {
                return this.createWhiteNoise(config.seed, config.scaling);
            }
            case NoiseType.BERNOULLI: {
                return this.createBernoulliNoise(
                    config.seed,
                    config.p,
                    config.scaling,
                );
            }
            case NoiseType.BERNOULLI_ISOLATED: {
                return this.createBernoulliNoiseIsolated(
                    config.seed,
                    config.p,
                    config.scaling,
                );
            }
            case NoiseType.BERNOULLI_ISOLATED_BIG: {
                return this.createBernoulliNoiseIsolatedBig(
                    config.seed,
                    config.p,
                    config.scaling,
                );
            }
            case NoiseType.BERNOULLI_ISOLATED_ROUND: {
                return this.createBernoulliNoiseIsolatedRound(
                    config.seed,
                    config.p,
                    config.scaling,
                );
            }
            case NoiseType.GAUSSIAN: {
                return this.createGaussianNoise(config.seed, config.scaling);
            }
            case NoiseType.BIASED_LOWER: {
                return this.createBiasedNoise(config.seed, BiasType.LOWER, config.scaling);
            }
            case NoiseType.BIASED_UPPER: {
                return this.createBiasedNoise(config.seed, BiasType.UPPER, config.scaling);
            }
            case NoiseType.BIASED_CENTER: {
                return this.createBiasedNoise(config.seed, BiasType.CENTER, config.scaling);
            }
            case NoiseType.BIASED_BOUNDS: {
                return this.createBiasedNoise(config.seed, BiasType.BOUNDS, config.scaling);
            }
            case NoiseType.BIASED_BOUNDS_CUBIC: {
                return this.createBiasedNoise(config.seed, BiasType.BOUNDS_BY_CUBIC, config.scaling);
            }
            case NoiseType.BIASED_BOUNDS_QUINTIC: {
                return this.createBiasedNoise(config.seed, BiasType.BOUNDS_BY_QUINTIC, config.scaling);
            }
            case NoiseType.BIASED_BOUNDS_SEPTIC: {
                return this.createBiasedNoise(config.seed, BiasType.BOUNDS_BY_SEPTIC, config.scaling);
            }
            case NoiseType.BIASED_BOUNDS_TRIG: {
                return this.createBiasedNoise(config.seed, BiasType.BOUNDS_BY_TRIG, config.scaling);
            }
        }
    }

    private createWhiteNoise(seed: number | null, scaleFactor: number = 1): Observable<CalculationState<Float32Array>> {
        const worker = new Worker(new URL('./noise-generator-white.worker.ts', import.meta.url));
        const setup: WorkerSetupWhiteNoise = {
            gridBlueprint: this._grid.withMarginBlueprint,
            seed: seed,
            scaleFactor: scaleFactor,
        };
        return executeWorker<WorkerSetupWhiteNoise, Float32Array>(worker, setup);
    }

    private createBernoulliNoise(seed: number | null, p: number = 0.5, scaleFactor: number = 1): Observable<CalculationState<Float32Array>> {
        return this.createBernoulliNoiseOfType(seed, BernoulliNoiseType.DEFAULT, p, scaleFactor);
    }

    private createBernoulliNoiseIsolated(seed: number | null, p: number = 0.5, scaleFactor: number = 1): Observable<CalculationState<Float32Array>> {
        return this.createBernoulliNoiseOfType(seed, BernoulliNoiseType.ISOLATED, p, scaleFactor);
    }

    private createBernoulliNoiseIsolatedBig(seed: number | null, p: number = 0.5, scaleFactor: number = 1): Observable<CalculationState<Float32Array>> {
        return this.createBernoulliNoiseOfType(seed, BernoulliNoiseType.ISOLATED_BIG, p, scaleFactor);
    }

    private createBernoulliNoiseIsolatedRound(seed: number | null, p: number = 0.5, scaleFactor: number = 1): Observable<CalculationState<Float32Array>> {
        return this.createBernoulliNoiseOfType(seed, BernoulliNoiseType.ISOLATED_ROUND, p, scaleFactor);
    }

    private createBernoulliNoiseOfType(seed: number | null, type: BernoulliNoiseType, p: number = 0.5, scaleFactor: number = 1): Observable<CalculationState<Float32Array>> {
        const worker = new Worker(new URL('./noise-generator-bernoulli.worker.ts', import.meta.url));
        const setup: WorkerSetupBernoulliNoise = {
            gridBlueprint: this._grid.withMarginBlueprint,
            seed: seed,
            type: type,
            p: p,
            scaleFactor: scaleFactor,
        };
        return executeWorker<WorkerSetupBernoulliNoise, Float32Array>(worker, setup);
    }

    private createBiasedNoise(seed: number | null, type: BiasType, scaleFactor: number = 1): Observable<CalculationState<Float32Array>> {
        const worker = new Worker(new URL('./noise-generator-biased.worker.ts', import.meta.url));
        const setup: WorkerSetupBiasedNoise = {
            gridBlueprint: this._grid.withMarginBlueprint,
            seed: seed,
            type: type,
            scaleFactor: scaleFactor,
        };
        return executeWorker<WorkerSetupBiasedNoise, Float32Array>(worker, setup);
    }

    private createGaussianNoise(
        seed: number | null,
        scaleFactor: number = 1,
    ): Observable<CalculationState<Float32Array>> {
        const worker = new Worker(new URL('./noise-generator-gaussian.worker.ts', import.meta.url));
        const setup: WorkerSetupGaussianNoise = {
            gridBlueprint: this._grid.withMarginBlueprint,
            seed: seed,
            mean: 0,
            standardDeviation: 1,
            range: 6,
            scaleFactor: scaleFactor,
        };
        return executeWorker<WorkerSetupGaussianNoise, Float32Array>(worker, setup);
    }
}