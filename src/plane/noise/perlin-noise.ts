import { lastValueFrom } from 'rxjs';
import { ColourMapper, ColourMapperConfig, Easing } from '../../../shared/colour/colour-mapper';
import { ModuleConfig } from '../../../shared/config';
import { InitializeAfterConstruct } from '../../../shared/initializable';
import { GridRange, GridRangeSerialized } from '../../grid/grid-range';
import { GridWithMargin } from '../../grid/grid-with-margin';
import { PerlinGenerator } from '../../math/perlin/perlin-generator';
import { BigDecimal } from '../../types/big-decimal';
import { Plane, PlaneConfig } from '../plane';
import { CREATE } from '../ui/plane-config-field-creator';

interface PerlinNoisePlaneConfig extends PlaneConfig {
    seed: number | null,
    octaveCount: number,
    octaveAmplitudeFactor: number,
    scaleFactor: number,
    gradient: ColourMapperConfig,
}

const INITIAL_GRID_RANGE: GridRange = { xMin: BigDecimal.ZERO, xMax: BigDecimal.fromNumber(50), yCenter: BigDecimal.ZERO };

@InitializeAfterConstruct()
export class PerlinNoise extends Plane {

    override config: ModuleConfig<PerlinNoisePlaneConfig> = new ModuleConfig(
        {
            gridRange: GridRange.serialize(INITIAL_GRID_RANGE),
            seed: null,
            octaveCount: 4,
            octaveAmplitudeFactor: 2,
            scaleFactor: 1,
            gradient: {
                supportPoints: '0:#FFFFFF, 1:#2222FF',
                easing: Easing.LAB_LINEAR,
                scaling: 1,
            },
        },
        'perlinNoise',
        [
            CREATE.UI_FIELD_HEADER_PERLIN,
            CREATE.uiFieldSeed('seed'),
            CREATE.uiFieldPerlinOctaveCount('octaveCount'),
            CREATE.uiFieldPerlinOctaveAmplitude('octaveAmplitudeFactor'),
            CREATE.uiFieldPerlinScaling('scaleFactor'),
            CREATE.UI_FIELD_HEADER_GRADIENT,
            CREATE.uiFieldGradientSupportPoints('gradient.supportPoints'),
            CREATE.uiFieldGradientEasing('gradient.easing'),
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
        this.resetProgress();
        const generator = new PerlinGenerator(new GridWithMargin(this.grid.resolution, this.grid.range, 0));
        const calculation$ = generator.createNoise(
            this.config.data.seed,
            this.config.data.octaveCount,
            this.config.data.octaveAmplitudeFactor,
            this.config.data.scaleFactor,
        );
        calculation$.subscribe({
            next: (state) => {
                this.setProgress(state.progress);
            }
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
        const colourMapper = ColourMapper.fromString(this.config.data.gradient.supportPoints, this.config.data.gradient.easing);
        for (let row = 0; row < this.grid.height; row++) {
            for (let col = 0; col < this.grid.width; col++) {
                const destinationIndex = this.grid.getIndex(col, row);
                this.setPixel(
                    imageData,
                    this.grid.getIndex(col, row),
                    colourMapper.mapClamped(data[destinationIndex]),
                );
            }
        }
        return imageData;
    }
}
