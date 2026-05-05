import { lastValueFrom } from 'rxjs';
import { InitializeAfterConstruct } from '../../../shared';
import { ModuleConfig } from '../../../shared/config';
import { GridRange, GridRangeSerialized } from '../../grid/grid-range';
import { GridWithMargin } from '../../grid/grid-with-margin';
import { NoiseGenerator } from '../../math/noise-generator/noise-generator';
import { BigDecimal, createGreyByIntensity } from '../../types';
import { Plane, PlaneConfig } from '../plane';
import { CREATE } from '../ui/plane-config-field-creator';

interface PerlinNoisePlaneConfig extends PlaneConfig {
    scaleFactor: number,
    octaveCount: number,
    octaveAmplitudeFactor: number,
}

const INITIAL_GRID_RANGE: GridRange = { xMin: BigDecimal.ZERO, xMax: BigDecimal.fromNumber(50), yCenter: BigDecimal.ZERO };

@InitializeAfterConstruct()
export class PerlinNoise extends Plane {

    override config: ModuleConfig<PerlinNoisePlaneConfig> = new ModuleConfig(
        {
            gridRange: GridRange.serialize(INITIAL_GRID_RANGE),
            scaleFactor: 1,
            octaveCount: 0,
            octaveAmplitudeFactor: 1,
        },
        'perlinNoise',
        [
            CREATE.createFloatField('scaleFactor', 'Scale Factor', 'Scale Factor for Perlin Noise', 0.001, 1000),
            CREATE.createIntegerField('octaveCount', 'Octave Count', 'Number of additional octaves', 0, 5),
            CREATE.createFloatField('octaveAmplitudeFactor', 'Octave Amp. Factor', 'Factor of the octaves amplitudes', 0.1, 10),
        ]
    );

    override refresh() {
        this.create();
    }

    private create() {
        this.grid.updateRange(GridRangeSerialized.deserialize(this.config.data.gridRange));
        this.createAndDraw();
    }

    private async createAndDraw() {
        this.setProgress(0);
        const generator = new NoiseGenerator(new GridWithMargin(this.grid.resolution, this.grid.range, 0));
        const calculation$ = generator.createPerlinNoise(
            this.config.data.scaleFactor,
            this.config.data.octaveCount,
            this.config.data.octaveAmplitudeFactor,
        );
        calculation$.subscribe({
            next: (state) => { this.setProgress(state.progress); }
        });
        const result = await lastValueFrom(calculation$);
        if (result.data != null) {
            this.updateImage(this.createImage(result.data));
            this.setIdle();
        } else {
            console.error('#createAndDraw - calculation did not produce data');
        }
    }

    private createImage(data: Float32Array): ImageDataArray {
        const imageData = new Uint8ClampedArray(this.grid.size * 4);
        for (let row = 0; row < this.grid.height; row++) {
            for (let col = 0; col < this.grid.width; col++) {
                const destinationIndex = this.grid.getIndex(col, row);
                this.setPixel(
                    imageData,
                    this.grid.getIndex(col, row),
                    createGreyByIntensity(data[destinationIndex])
                );
            }
        }
        return imageData;
    }
}
