import { Observable } from 'rxjs';
import { GridWithMargin } from '../../grid/grid-with-margin';
import { executeWorker } from '../../worker/execute-worker';
import { CalculationState } from '../../worker/types';
import { BernoulliNoiseType, BiasType } from './types';
import { WorkerSetupBernoulliNoise } from './worker-setup-bernoulli-noise';
import { WorkerSetupBiasedNoise } from './worker-setup-biased-noise';
import { WorkerSetupGaussianNoise } from './worker-setup-gaussian-noise';
import { WorkerSetupPerlinNoise } from './worker-setup-perlin-noise';
import { WorkerSetupWhiteNoise } from './worker-setup-white-noise';

export enum NoiseType {
    WHITE = 'White Noise',
    BERNOULLI = 'Bernoulli Noise',
    BERNOULLI_ISOLATED = 'Bernoulli Noise Isolated',
    BERNOULLI_ISOLATED_BIG = 'Bernoulli Noise Isolated Big',
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
                return this.createWhiteNoise(config.scaling);
            }
            case NoiseType.BERNOULLI: {
                return this.createBernoulliNoise(
                    config.p,
                    config.scaling,
                );
            }
            case NoiseType.BERNOULLI_ISOLATED: {
                return this.createBernoulliNoiseIsolated(
                    config.p,
                    config.scaling,
                );
            }
            case NoiseType.BERNOULLI_ISOLATED_BIG: {
                return this.createBernoulliNoiseIsolatedBig(
                    config.p,
                    config.scaling,
                );
            }
            case NoiseType.GAUSSIAN: {
                return this.createGaussianNoise(config.scaling);
            }
            case NoiseType.BIASED_LOWER: {
                return this.createBiasedNoise(BiasType.LOWER, config.scaling);
            }
            case NoiseType.BIASED_UPPER: {
                return this.createBiasedNoise(BiasType.UPPER, config.scaling);
            }
            case NoiseType.BIASED_CENTER: {
                return this.createBiasedNoise(BiasType.CENTER, config.scaling);
            }
            case NoiseType.BIASED_BOUNDS: {
                return this.createBiasedNoise(BiasType.BOUNDS, config.scaling);
            }
            case NoiseType.BIASED_BOUNDS_CUBIC: {
                return this.createBiasedNoise(BiasType.BOUNDS_BY_CUBIC, config.scaling);
            }
            case NoiseType.BIASED_BOUNDS_QUINTIC: {
                return this.createBiasedNoise(BiasType.BOUNDS_BY_QUINTIC, config.scaling);
            }
            case NoiseType.BIASED_BOUNDS_SEPTIC: {
                return this.createBiasedNoise(BiasType.BOUNDS_BY_SEPTIC, config.scaling);
            }
            case NoiseType.BIASED_BOUNDS_TRIG: {
                return this.createBiasedNoise(BiasType.BOUNDS_BY_TRIG, config.scaling);
            }
        }
    }

    public createPerlinNoise(scaleFactor: number = 1, octaveCount: number = 0, octaveAmplitudeFactor: number = 1): Observable<CalculationState<Float32Array>> {
        const worker = new Worker(new URL('./noise-generator-perlin.worker.ts', import.meta.url));
        const setup: WorkerSetupPerlinNoise = {
            gridBlueprint: this._grid.withMarginBlueprint,
            scaleFactor: scaleFactor,
            octaveCount: octaveCount,
            octaveAmplitudeFactor: octaveAmplitudeFactor,
        };
        return executeWorker<WorkerSetupPerlinNoise, Float32Array>(worker, setup);
    }

    private createWhiteNoise(scaleFactor: number = 1): Observable<CalculationState<Float32Array>> {
        const worker = new Worker(new URL('./noise-generator-white.worker.ts', import.meta.url));
        const setup: WorkerSetupWhiteNoise = { gridBlueprint: this._grid.withMarginBlueprint, scaleFactor: scaleFactor };
        return executeWorker<WorkerSetupWhiteNoise, Float32Array>(worker, setup);
    }

    private createBernoulliNoise(p: number = 0.5, scaleFactor: number = 1): Observable<CalculationState<Float32Array>> {
        return this.createBernoulliNoiseOfType(BernoulliNoiseType.DEFAULT, p, scaleFactor);
    }

    private createBernoulliNoiseIsolated(p: number = 0.5, scaleFactor: number = 1): Observable<CalculationState<Float32Array>> {
        return this.createBernoulliNoiseOfType(BernoulliNoiseType.ISOLATED, p, scaleFactor);
    }

    private createBernoulliNoiseIsolatedBig(p: number = 0.5, scaleFactor: number = 1): Observable<CalculationState<Float32Array>> {
        return this.createBernoulliNoiseOfType(BernoulliNoiseType.ISOLATED_BIG, p, scaleFactor);
    }

    private createBernoulliNoiseOfType(type: BernoulliNoiseType, p: number = 0.5, scaleFactor: number = 1): Observable<CalculationState<Float32Array>> {
        const worker = new Worker(new URL('./noise-generator-bernoulli.worker.ts', import.meta.url));
        const setup: WorkerSetupBernoulliNoise = {
            type: type,
            gridBlueprint: this._grid.withMarginBlueprint,
            p: p,
            scaleFactor: scaleFactor,
        };
        return executeWorker<WorkerSetupBernoulliNoise, Float32Array>(worker, setup);
    }

    private createBiasedNoise(type: BiasType, scaleFactor: number = 1): Observable<CalculationState<Float32Array>> {
        const worker = new Worker(new URL('./noise-generator-biased.worker.ts', import.meta.url));
        const setup: WorkerSetupBiasedNoise = {
            type: type,
            gridBlueprint: this._grid.withMarginBlueprint,
            scaleFactor: scaleFactor,
        };
        return executeWorker<WorkerSetupBiasedNoise, Float32Array>(worker, setup);
    }

    private createGaussianNoise(
        scaleFactor: number = 1,
        mean: number = 0,
        standardDeviation: number = 1,
        range: number = 6,
    ): Observable<CalculationState<Float32Array>> {
        const worker = new Worker(new URL('./noise-generator-gaussian.worker.ts', import.meta.url));
        const setup: WorkerSetupGaussianNoise = {
            gridBlueprint: this._grid.withMarginBlueprint,
            mean: mean,
            standardDeviation: standardDeviation,
            range: range,
            scaleFactor: scaleFactor,
        };
        return executeWorker<WorkerSetupGaussianNoise, Float32Array>(worker, setup);
    }
}