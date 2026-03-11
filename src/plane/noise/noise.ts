import { lastValueFrom, Observable, Subscription, timer } from 'rxjs';
import { InitializeAfterConstruct, ModuleConfig } from '../../../shared';
import { GridRange } from '../../grid/grid-range';
import { GridWithMargin } from '../../grid/grid-with-margin';
import { NoiseGenerator } from '../../math/noise-generator/noise-generator';
import { BiasType, NoiseScaleFactor } from '../../math/noise-generator/types';
import { CalculationState } from '../../worker/types';
import { Plane, PlaneConfig } from '../plane';

const INITIAL_GRID_RANGE: GridRange = { xMin: 0, xMax: 1, yCenter: 0 };

@InitializeAfterConstruct()
export class Noise extends Plane {

    private _generator: NoiseGenerator;
    private _data: Float64Array;
    private _noiseIndexSubscription: Subscription;

    override config: ModuleConfig<PlaneConfig> = new ModuleConfig(
        { gridRange: INITIAL_GRID_RANGE },
        'noise',
    );

    public init(): void {
        this._generator = new NoiseGenerator(new GridWithMargin(this.grid.resolution, this.grid.range, 0));
        this.create();
    }

    override refresh() {
        // Nothing to do here, Noise does not change depending on Grid Range
    }

    override onDestroy(): void {
        super.onDestroy();
        this._noiseIndexSubscription?.unsubscribe();
    }

    private create() {
        const range = this.config.data.gridRange;
        this.grid.updateRange(range);
        let noiseIndex: number = 0;

        this._noiseIndexSubscription = timer(0, 2000).subscribe(() => {
            noiseIndex++;
            this.createAndDraw(noiseIndex);
            if (noiseIndex > 15) noiseIndex = 0;
        });
        // this.createAndDraw(noiseIndex);
    }

    private async createAndDraw(noiseIndex: number) {
        this.setProgress(0);
        const calculation$ = this.createNoise(noiseIndex);
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

    private createNoise(index: number): Observable<CalculationState<Float64Array>> {
        switch (index) {
            case 1: {
                console.log('#createNoise - Bernoulli Noise');
                return this._generator.createBernoulliNoise();
            }
            case 2: {
                console.log('#createNoise - Bernoulli Noise - scaled 4');
                return this._generator.createBernoulliNoise(0.5, NoiseScaleFactor.FOUR);
            }
            case 3: {
                console.log('#createNoise - Isolated Black Noise');
                return this._generator.createBernoulliNoiseIsolated();
            }
            case 4: {
                console.log('#createNoise - Isolated Black Noise - scaled 2');
                return this._generator.createBernoulliNoiseIsolated(0.5, NoiseScaleFactor.TWO);
            }
            case 5: {
                console.log('#createNoise - Isolated Big Black Noise');
                return this._generator.createBernoulliNoiseIsolatedBig();
            }
            case 6: {
                console.log('#createNoise - Isolated Big Black Noise - scaled 2');
                return this._generator.createBernoulliNoiseIsolatedBig(0.5, NoiseScaleFactor.TWO);
            }
            case 7: {
                console.log('#createNoise - Gaussian Noise');
                return this._generator.createGaussianNoise();
            }
            case 8: {
                console.log('#createNoise - Biased Noise LOWER');
                return this._generator.createBiasedNoise(BiasType.LOWER);
            }
            case 9: {
                console.log('#createNoise - Biased Noise UPPER');
                return this._generator.createBiasedNoise(BiasType.UPPER);
            }
            case 10: {
                console.log('#createNoise - Biased Noise CENTER');
                return this._generator.createBiasedNoise(BiasType.CENTER);
            }
            case 11: {
                console.log('#createNoise - Biased Noise BOUNDS');
                return this._generator.createBiasedNoise(BiasType.BOUNDS);
            }
            case 12: {
                console.log('#createNoise - Biased Noise BOUNDS_BY_CUBIC');
                return this._generator.createBiasedNoise(BiasType.BOUNDS_BY_CUBIC);
            }
            case 13: {
                console.log('#createNoise - Biased Noise BOUNDS_BY_QUINTIC');
                return this._generator.createBiasedNoise(BiasType.BOUNDS_BY_QUINTIC);
            }
            case 14: {
                console.log('#createNoise - Biased Noise BOUNDS_BY_SEPTIC');
                return this._generator.createBiasedNoise(BiasType.BOUNDS_BY_SEPTIC);
            }
            case 15: {
                console.log('#createNoise - Biased Noise BOUNDS_BY_TRIG');
                return this._generator.createBiasedNoise(BiasType.BOUNDS_BY_TRIG);
            }
            default: {
                console.log('#createNoise - White Noise');
                return this._generator.createWhiteNoise();
            }
        }
    }
}