import { lastValueFrom } from 'rxjs';
import { InitializeAfterConstruct } from '../../../shared';
import { ModuleConfig } from '../../../shared/config';
import { Grid } from '../../grid/grid';
import { GridRange, GridRangeSerialized } from '../../grid/grid-range';
import { GridWithMargin } from '../../grid/grid-with-margin';
import { NoiseConfig, NoiseGenerator, NoiseType } from '../../math/noise-generator/noise-generator';
import { BigDecimal, createGreyByIntensity } from '../../types';
import { Plane, PlaneConfig } from '../plane';
import { CREATE } from '../ui/plane-config-field-creator';

interface NoisePlaneConfig extends PlaneConfig {
    config: NoiseConfig,
}

const INITIAL_GRID_RANGE: GridRange = { xMin: BigDecimal.ZERO, xMax: BigDecimal.ONE, yCenter: BigDecimal.ZERO };

@InitializeAfterConstruct()
export class Noise extends Plane {

    private _generator: NoiseGenerator;

    constructor(grid: Grid) {
        super(grid);
        this._generator = new NoiseGenerator(new GridWithMargin(this.grid.resolution, this.grid.range, 0));
    }

    override config: ModuleConfig<NoisePlaneConfig> = new ModuleConfig(
        {
            gridRange: GridRange.serialize(INITIAL_GRID_RANGE),
            config: {
                seed: null,
                type: NoiseType.WHITE,
                p: 0.5,
                scaling: 1,
            }
        },
        'noise',
        [
            CREATE.UI_FIELD_HEADER_NOISE,
            CREATE.uiFieldSeed('config.seed'),
            CREATE.uiFieldNoiseType('config.type'),
            CREATE.uiFieldNoiseP('config.p'),
            CREATE.uiFieldNoiseScaling('config.scaling'),
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
        const calculation$ = this._generator.createNoise(this.config.data.config);
        calculation$.subscribe({
            next: (state) => { this.setProgress(state.progress); }
        });
        const result = await lastValueFrom(calculation$);
        if (result.data != null) {
            const data = result.data;
            this.updateImage(this.createImage(data));
            this.setIdle();
        } else {
            console.error('#calculate - calculation did not produce data');
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
