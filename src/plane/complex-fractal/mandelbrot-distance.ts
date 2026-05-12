import { lastValueFrom } from 'rxjs';
import { InitializeAfterConstruct } from '../../../shared';
import { ModuleConfig } from '../../../shared/config';
import { GridRange } from '../../grid/grid-range';
import { ColorMapper, ColorMapperConfig, Easing } from '../../math/color/color-mapper';
import { MandelbrotCalculator } from '../../math/complex-fractal/mandelbrot-calculator';
import { BigDecimal, stringToRgb } from '../../types';
import { Plane, PlaneConfig } from '../plane';
import { CREATE } from '../ui/plane-config-field-creator';
import { estimateMaxIterations } from './estimate-max-iterations';

interface MandelbrotDistanceConfig extends PlaneConfig {
    maxIterations: number,
    escapeValue: number,
    gradient: ColorMapperConfig,
    fallbackColor: string,
}

const INITIAL_GRID_RANGE: GridRange = { xMin: BigDecimal.fromNumber(-3), xMax: BigDecimal.fromNumber(1.8), yCenter: BigDecimal.ZERO };

@InitializeAfterConstruct()
export class MandelbrotDistance extends Plane {

    private _effectiveMaxIterations = 255;

    override config: ModuleConfig<MandelbrotDistanceConfig> = new ModuleConfig(
        {
            gridRange: GridRange.serialize(INITIAL_GRID_RANGE),
            maxIterations: 0,
            escapeValue: 100,
            gradient: {
                supportPoints: '0:#FFFFFF, 0.5:#000000, 1:#FFFFFF',
                easing: Easing.RGB_LINEAR,
                scaling: 0.1,
            },
            fallbackColor: '#000000',
        },
        'mandelbrotDistanceConfig',
        [
            CREATE.UI_FIELD_HEADER_FRACTAL,
            CREATE.uiFieldFractalMaxIterations('maxIterations'),
            CREATE.uiFieldFractalEscapeValue('escapeValue'),
            CREATE.UI_FIELD_HEADER_GRADIENT,
            CREATE.uiFieldGradientSupportPoints('gradient.supportPoints'),
            CREATE.uiFieldGradientEasing('gradient.easing'),
            CREATE.uiFieldGradientScaling('gradient.scaling'),
            CREATE.uiFieldFallbackColor('fallbackColor'),
        ],
    );

    override refresh() {
        this.calculate();
    }

    private async calculate() {
        const calculator = new MandelbrotCalculator();
        this._effectiveMaxIterations = estimateMaxIterations(this.config.data.maxIterations, GridRange.rangeXdiff(INITIAL_GRID_RANGE), this.grid.xDiff);
        console.log(`#calculate - with max iterations ${this._effectiveMaxIterations}`);

        this.resetProgress();
        const calculation$ = calculator.calculateDistances(this.grid, this._effectiveMaxIterations, this.config.data.escapeValue);
        calculation$.subscribe({
            next: (state) => { this.setProgress(state.progress); }
        });
        const result = await lastValueFrom(calculation$);
        if (result.data != null) {
            this.updateImage(this.createImage(result.data));
            this.setIdle();
        } else {
            console.error('#calculate - calculation did not produce data');
        }
    }

    private createImage(data: Float64Array): ImageDataArray {
        let max = 0;
        data.forEach(value => { if (value > max) max = value; });
        const imageData = new Uint8ClampedArray(this.grid.size * 4);
        const colorMapper = ColorMapper.fromString(this.config.data.gradient.supportPoints, this.config.data.gradient.easing);
        const fallbackColor = stringToRgb(this.config.data.fallbackColor);

        for (let row = 0; row < this.grid.height; row++) {
            for (let col = 0; col < this.grid.width; col++) {
                const index = this.grid.getIndex(col, row);
                let value = data[index];

                this.setPixel(
                    imageData,
                    index,
                    (value <= 0) ? fallbackColor : colorMapper.mapLooped(value, max * this.config.data.gradient.scaling),
                );
            }
        }
        return imageData;
    }
}