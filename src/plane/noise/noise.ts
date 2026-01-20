import { Subscription, timer } from 'rxjs';
import { ModuleConfig } from '../../config/module-config';
import { Grid } from '../../grid/grid';
import { GridRange } from '../../grid/grid-range';
import { BiasType, NoiseGenerator } from '../../math/noise-generator/noise-generator';
import { Plane, PlaneConfig } from '../plane';

const INITIAL_GRID_RANGE: GridRange = { xMin: 0, xMax: 1, yCenter: 0 };

export class Noise extends Plane {

    private _generator: NoiseGenerator;
    private _data: Float64Array;
    private _noiseIndex: number = 0;
    private _noiseIndexSubscription: Subscription;

    constructor(grid: Grid) {
        super(grid);
        this._generator = new NoiseGenerator(grid);
        this.create();
    }

    override config: ModuleConfig<PlaneConfig> = new ModuleConfig(
        { gridRange: INITIAL_GRID_RANGE },
        'noise',
    );

    override name: string = 'Noise';

    override updateGridRange(selectedRange: GridRange) {
        // ToDo
    }

    override setMaxIterations(value: number) {
        // Does not apply
    }

    override onDestroy(): void {
        super.onDestroy();
        this._noiseIndexSubscription.unsubscribe();
    }

    private create() {
        const range = this.config.data.gridRange;
        this.grid.updateRange(range);

        this._noiseIndexSubscription = timer(0, 2000).subscribe(() => {
            this._data = this.createNoise(this._noiseIndex);
            this._noiseIndex++;
            if (this._noiseIndex > 10) this._noiseIndex = 0;
            this.updateImage(this.createImage());
        });
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

    private createNoise(index: number): Float64Array {
        switch (index) {
            case 1: {
                console.log('#createNoise - Bernoulli Noise');
                return this._generator.createBernoulliNoise();
            }
            case 2: {
                console.log('#createNoise - Gaussian Noise');
                return this._generator.createGaussianNoise();
            }
            case 3: {
                console.log('#createNoise - Biased Noise LOWER');
                return this._generator.createBiasedNoise(BiasType.LOWER);
            }
            case 4: {
                console.log('#createNoise - Biased Noise UPPER');
                return this._generator.createBiasedNoise(BiasType.UPPER);
            }
            case 5: {
                console.log('#createNoise - Biased Noise CENTER');
                return this._generator.createBiasedNoise(BiasType.CENTER);
            }
            case 6: {
                console.log('#createNoise - Biased Noise BOUNDS');
                return this._generator.createBiasedNoise(BiasType.BOUNDS);
            }
            case 7: {
                console.log('#createNoise - Biased Noise BOUNDS_BY_CUBIC');
                return this._generator.createBiasedNoise(BiasType.BOUNDS_BY_CUBIC);
            }
            case 8: {
                console.log('#createNoise - Biased Noise BOUNDS_BY_QUINTIC');
                return this._generator.createBiasedNoise(BiasType.BOUNDS_BY_QUINTIC);
            }
            case 9: {
                console.log('#createNoise - Biased Noise BOUNDS_BY_SEPTIC');
                return this._generator.createBiasedNoise(BiasType.BOUNDS_BY_SEPTIC);
            }
            case 10: {
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