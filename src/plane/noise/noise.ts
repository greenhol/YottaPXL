import { lastValueFrom, Observable, Subscription } from 'rxjs';
import { InitializeAfterConstruct } from '../../../shared';
import { ModuleConfig, UiFieldFloat, UiFieldInteger, UiFieldStringEnum } from '../../../shared/config';
import { GridRange } from '../../grid/grid-range';
import { GridWithMargin } from '../../grid/grid-with-margin';
import { NoiseGenerator } from '../../math/noise-generator/noise-generator';
import { BiasType, NoiseScaleFactor } from '../../math/noise-generator/types';
import { CalculationState } from '../../worker/types';
import { Plane, PlaneConfig } from '../plane';

enum NoiseType {
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

interface NoiseConfig extends PlaneConfig {
    noiseType: NoiseType,
    noiseScaleFactor: number,
    bernoulliProbability: number,
}

const INITIAL_GRID_RANGE: GridRange = { xMin: 0, xMax: 1, yCenter: 0 };

@InitializeAfterConstruct()
export class Noise extends Plane {

    private _generator: NoiseGenerator;
    private _data: Float64Array;
    private _noiseIndexSubscription: Subscription;

    override config: ModuleConfig<NoiseConfig> = new ModuleConfig(
        {
            gridRange: INITIAL_GRID_RANGE,
            noiseType: NoiseType.WHITE,
            noiseScaleFactor: NoiseScaleFactor.NONE,
            bernoulliProbability: 0.5,
        },
        'noise',
        [
            new UiFieldStringEnum('noiseType', NoiseType, 'Noise Type', 'Noise Image type'),
            new UiFieldInteger('noiseScaleFactor', 'Noise Scale', 'Scaling of Noise Image', 1, 10),
            new UiFieldFloat('bernoulliProbability', 'Bernoulli p', 'Probability a pixel is set to Black or White', 0, 1),
        ]
    );

    public init(): void {
        this._generator = new NoiseGenerator(new GridWithMargin(this.grid.resolution, this.grid.range, 0));
        this.create();
    }

    override refresh() {
        this.create();
    }

    override onDestroy(): void {
        super.onDestroy();
        this._noiseIndexSubscription?.unsubscribe();
    }

    private create() {
        const range = this.config.data.gridRange;
        this.grid.updateRange(range);
        this.createAndDraw(this.config.data.noiseType);
    }

    private async createAndDraw(noiseType: NoiseType) {
        this.setProgress(0);
        const calculation$ = this.createNoise(noiseType);
        calculation$.subscribe({
            next: (state) => { this.setProgress(state.progress) }
        });
        const result = await lastValueFrom(calculation$);
        if (result.data != null) {
            this._data = result.data;
            this.updateImage(this.createImage());
            this.setIdle();
        } else {
            console.error('#calculate - calculation did not produce data')
        }
    }

    private createImage(): ImageDataArray {
        const imageData = new Uint8ClampedArray(this.grid.size * 4);
        for (let row = 0; row < this.grid.height; row++) {
            for (let col = 0; col < this.grid.width; col++) {
                const destinationIndex = this.grid.getIndex(col, row);
                let value = Math.round(this._data[destinationIndex] * 255);
                const index = this.grid.getIndex(col, row);
                const pixelIndex = index * 4;
                imageData[pixelIndex] = value;     // R
                imageData[pixelIndex + 1] = value; // G
                imageData[pixelIndex + 2] = value; // B
                imageData[pixelIndex + 3] = 255; // A (opaque)
            }
        }
        return imageData;
    }

    private createNoise(noiseType: NoiseType): Observable<CalculationState<Float64Array>> {
        console.info(`#createNoise - ${noiseType}, ${this.config.data.noiseScaleFactor}`);
        switch (noiseType) {
            case NoiseType.WHITE: {
                return this._generator.createWhiteNoise(this.config.data.noiseScaleFactor);
            }
            case NoiseType.BERNOULLI: {
                return this._generator.createBernoulliNoise(
                    this.config.data.bernoulliProbability,
                    this.config.data.noiseScaleFactor,
                );
            }
            case NoiseType.BERNOULLI_ISOLATED: {
                return this._generator.createBernoulliNoiseIsolated(
                    this.config.data.bernoulliProbability,
                    this.config.data.noiseScaleFactor,
                );
            }
            case NoiseType.BERNOULLI_ISOLATED_BIG: {
                return this._generator.createBernoulliNoiseIsolatedBig(
                    this.config.data.bernoulliProbability,
                    this.config.data.noiseScaleFactor,
                );
            }
            case NoiseType.GAUSSIAN: {
                return this._generator.createGaussianNoise(this.config.data.noiseScaleFactor);
            }
            case NoiseType.BIASED_LOWER: {
                return this._generator.createBiasedNoise(BiasType.LOWER, this.config.data.noiseScaleFactor);
            }
            case NoiseType.BIASED_UPPER: {
                return this._generator.createBiasedNoise(BiasType.UPPER, this.config.data.noiseScaleFactor);
            }
            case NoiseType.BIASED_CENTER: {
                return this._generator.createBiasedNoise(BiasType.CENTER, this.config.data.noiseScaleFactor);
            }
            case NoiseType.BIASED_BOUNDS: {
                return this._generator.createBiasedNoise(BiasType.BOUNDS, this.config.data.noiseScaleFactor);
            }
            case NoiseType.BIASED_BOUNDS_CUBIC: {
                return this._generator.createBiasedNoise(BiasType.BOUNDS_BY_CUBIC, this.config.data.noiseScaleFactor);
            }
            case NoiseType.BIASED_BOUNDS_QUINTIC: {
                return this._generator.createBiasedNoise(BiasType.BOUNDS_BY_QUINTIC, this.config.data.noiseScaleFactor);
            }
            case NoiseType.BIASED_BOUNDS_SEPTIC: {
                return this._generator.createBiasedNoise(BiasType.BOUNDS_BY_SEPTIC, this.config.data.noiseScaleFactor);
            }
            case NoiseType.BIASED_BOUNDS_TRIG: {
                return this._generator.createBiasedNoise(BiasType.BOUNDS_BY_TRIG, this.config.data.noiseScaleFactor);
            }
        }
    }
}
