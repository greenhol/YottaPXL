import { lastValueFrom } from 'rxjs';
import { InitializeAfterConstruct } from '../../../shared';
import { ModuleConfig } from '../../../shared/config';
import { GridRange, gridRangeToJson, rangeXdiff } from '../../grid/grid-range';
import { ColorMapper, ColorMapperConfig, Easing } from '../../math/color/color-mapper';
import { MandelbrotCalculator } from '../../math/complex-fractal/mandelbrot-calculator';
import { Plane, PlaneConfig } from '../plane';
import { CREATE } from '../ui/plane-config-field-creator';
import { stringToRgb } from './../../types/color';
import { estimateMaxIterations } from './estimate-max-iterations';
import { BigDecimal } from '../../types';

interface MandelbrotIterationsConfig extends PlaneConfig {
    maxIterations: number,
    interpolate: boolean,
    precision: boolean,
    referenceCoordinate: string,
    gradient: ColorMapperConfig,
    fallbackColor: string,
}

const INITIAL_GRID_RANGE: GridRange = { xMin: BigDecimal.fromNumber(-3), xMax: BigDecimal.fromNumber(1.8), yCenter: BigDecimal.ZERO };

@InitializeAfterConstruct()
export class MandelbrotIterations extends Plane {

    private _effectiveMaxIterations = 255;

    override config: ModuleConfig<MandelbrotIterationsConfig> = new ModuleConfig(
        {
            gridRange: gridRangeToJson(INITIAL_GRID_RANGE),
            maxIterations: 0,
            interpolate: false,
            precision: false,
            referenceCoordinate: '',
            gradient: {
                supportPoints: '0:#000000, 0.5:#FFFFFF, 1:#000000',
                easing: Easing.RGB_LINEAR,
                scaling: 1,
            },
            fallbackColor: '#000000',
        },
        'mandelbrotIterationsConfig',
        [
            CREATE.UI_FIELD_HEADER_FRACTAL,
            CREATE.uiFieldFractalMaxIterations('maxIterations'),
            CREATE.uiFieldFractalInterpolate('interpolate'),
            CREATE.uiFieldFractalPrecision('precision'),
            CREATE.uiFieldFractalReferenceCoordinate('referenceCoordinate'),
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
        this._effectiveMaxIterations = estimateMaxIterations(this.config.data.maxIterations, rangeXdiff(INITIAL_GRID_RANGE), this.grid.xDiff);
        console.log(`#calculate - with max iterations ${this._effectiveMaxIterations}`);

        this.setProgress(0);
        const calculator = new MandelbrotCalculator();
        const calculation$ = this.config.data.interpolate
            ? calculator.calculateSmoothIterations(this.grid, this._effectiveMaxIterations, this.config.data.precision, this.config.data.referenceCoordinate)
            : calculator.calculateIterations(this.grid, this._effectiveMaxIterations, this.config.data.precision, this.config.data.referenceCoordinate);
        calculation$.subscribe({ next: (state) => { this.setProgress(state.progress); } });
        const result = await lastValueFrom(calculation$);
        if (result.data != null) {
            this.updateImage(this.createImage(result.data));
            this.setIdle();
        } else {
            console.error('#calculate - calculation did not produce data');
        }
    }

    private createImage(data: Float64Array): ImageDataArray {
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
                    (value >= this._effectiveMaxIterations) ? fallbackColor : colorMapper.mapLooped(value, 255 * this.config.data.gradient.scaling),
                );
            }
        }
        return imageData;
    }
}