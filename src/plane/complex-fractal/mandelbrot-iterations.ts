import { lastValueFrom } from 'rxjs';
import { InitializeAfterConstruct } from '../../../shared';
import { ModuleConfig } from '../../../shared/config';
import { GridRange, rangeXdiff } from '../../grid/grid-range';
import { ColorMapper, ColorMapperConfig, Easing } from '../../math/color/color-mapper';
import { MandelbrotCalculator } from '../../math/complex-fractal/mandelbrot-calculator';
import { Plane, PlaneConfig } from '../plane';
import { UI_SCHEMA_HEADER_FRACTAL, UI_SCHEMA_HEADER_GRADIENT, uiSchemaFractalMaxIterations, uiSchemaGradientEasing, uiSchemaGradientScaling, uiSchemaGradientSupportPoints } from '../ui-schema/ui-fields';
import { COLOR } from './../../types/color';
import { estimateMaxIterations } from './estimate-max-iterations';

interface MandelbrotIterationsConfig extends PlaneConfig {
    maxIterations: number,
    gradient: ColorMapperConfig,
}

const INITIAL_GRID_RANGE: GridRange = { xMin: -3, xMax: 1.8, yCenter: 0 };

@InitializeAfterConstruct()
export class MandelbrotIterations extends Plane {

    private _effectiveMaxIterations = 255;

    override config: ModuleConfig<MandelbrotIterationsConfig> = new ModuleConfig(
        {
            gridRange: INITIAL_GRID_RANGE,
            maxIterations: 0,
            gradient: {
                supportPoints: '0:#000000, 0.5:#FFFFFF, 1:#000000',
                easing: Easing.LINEAR,
                scaling: 1,
            },
        },
        'mandelbrotIterationsConfig',
        [
            UI_SCHEMA_HEADER_FRACTAL,
            uiSchemaFractalMaxIterations('maxIterations'),
            UI_SCHEMA_HEADER_GRADIENT,
            uiSchemaGradientSupportPoints('gradient.supportPoints'),
            uiSchemaGradientEasing('gradient.easing'),
            uiSchemaGradientScaling('gradient.scaling'),
        ],
    );

    override refresh() {
        this.calculate();
    }

    private async calculate() {
        this._effectiveMaxIterations = estimateMaxIterations(this.config.data.maxIterations, rangeXdiff(INITIAL_GRID_RANGE), this.grid.xDiff);
        console.log(`#calculate - with max iterations ${this._effectiveMaxIterations}`);

        this.setProgress(0);
        const calculation$ = new MandelbrotCalculator().calculateIterations(this.grid, this._effectiveMaxIterations);
        calculation$.subscribe({
            next: (state) => { this.setProgress(state.progress) }
        });
        const result = await lastValueFrom(calculation$);
        if (result.data != null) {
            this.updateImage(this.createImage(result.data));
            this.setIdle();
        } else {
            console.error('#calculate - calculation did not produce data')
        }
    }

    private createImage(data: Float64Array): ImageDataArray {
        const imageData = new Uint8ClampedArray(this.grid.size * 4);
        const colorMapper = ColorMapper.fromString(this.config.data.gradient.supportPoints, this.config.data.gradient.easing);
        this.config.setInfo('Gradient', colorMapper.supportPointsString);

        for (let row = 0; row < this.grid.height; row++) {
            for (let col = 0; col < this.grid.width; col++) {
                const index = this.grid.getIndex(col, row);
                let value = data[index];
                const color = (value === this._effectiveMaxIterations) ? COLOR.BLACK : colorMapper.map(value, 255 * this.config.data.gradient.scaling);
                const pixelIndex = index * 4;
                imageData[pixelIndex] = color.r;
                imageData[pixelIndex + 1] = color.g;
                imageData[pixelIndex + 2] = color.b;
                imageData[pixelIndex + 3] = 255; // A (opaque)
            }
        }
        return imageData;
    }
}