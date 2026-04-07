import { lastValueFrom, Subscription } from 'rxjs';
import { InitializeAfterConstruct } from '../../../shared';
import { ModuleConfig } from '../../../shared/config';
import { Grid } from '../../grid/grid';
import { GridRange } from '../../grid/grid-range';
import { GridWithMargin } from '../../grid/grid-with-margin';
import { NoiseConfig, NoiseGenerator, NoiseType } from '../../math/noise-generator/noise-generator';
import { NoiseScaleFactor } from '../../math/noise-generator/types';
import { Plane, PlaneConfig } from '../plane';
import { UI_SCHEMA_HEADER_NOISE, uiSchemaNoiseP, uiSchemaNoiseScaling, uiSchemaNoiseType } from '../ui-schema/ui-fields';

interface NoisePlaneConfig extends PlaneConfig {
    config: NoiseConfig,
}

const INITIAL_GRID_RANGE: GridRange = { xMin: 0, xMax: 1, yCenter: 0 };

@InitializeAfterConstruct()
export class Noise extends Plane {

    private _generator: NoiseGenerator;
    private _data: Float64Array;
    private _noiseIndexSubscription: Subscription;

    constructor(grid: Grid) {
        super(grid);
        this._generator = new NoiseGenerator(new GridWithMargin(this.grid.resolution, this.grid.range, 0));
    }

    override config: ModuleConfig<NoisePlaneConfig> = new ModuleConfig(
        {
            gridRange: INITIAL_GRID_RANGE,
            config: {
                type: NoiseType.WHITE,
                p: 0.5,
                scaling: NoiseScaleFactor.NONE,
            }
        },
        'noise',
        [
            UI_SCHEMA_HEADER_NOISE,
            uiSchemaNoiseType('config.type'),
            uiSchemaNoiseP('config.p'),
            uiSchemaNoiseScaling('config.scaling'),
        ]
    );

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
        this.createAndDraw(this.config.data.config);
    }

    private async createAndDraw(noiseConfig: NoiseConfig) {
        this.setProgress(0);
        const calculation$ = this._generator.createNoise(noiseConfig);
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
}
