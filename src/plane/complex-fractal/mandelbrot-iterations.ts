import { lastValueFrom } from 'rxjs';
import { Colour } from '../../../shared/colour/colour';
import { ColourMapper, ColourMapperConfig, Easing } from '../../../shared/colour/colour-mapper';
import { ModuleConfig } from '../../../shared/config';
import { InitializeAfterConstruct } from '../../../shared/initializable';
import { GridRange } from '../../grid/grid-range';
import { MandelbrotCalculator } from '../../math/complex-fractal/mandelbrot-calculator';
import { BigDecimal } from '../../types/big-decimal';
import { Plane, PlaneConfig } from '../plane';
import { CREATE } from '../ui/plane-config-field-creator';
import { estimateMaxIterations } from './estimate-max-iterations';
import { shapeIterationCountForColour } from './shape-iteration-count-for-colour';

interface MandelbrotIterationsConfig extends PlaneConfig {
    maxIterations: number,
    interpolate: boolean,
    precision: boolean,
    referenceCoordinate: string,
    useLogColourScaling: boolean,
    gradient: ColourMapperConfig,
    fallbackColour: string,
}

const INITIAL_GRID_RANGE: GridRange = { xMin: BigDecimal.fromNumber(-3), xMax: BigDecimal.fromNumber(1.8), yCenter: BigDecimal.ZERO };

@InitializeAfterConstruct()
export class MandelbrotIterations extends Plane {

    private _effectiveMaxIterations = 255;

    override config: ModuleConfig<MandelbrotIterationsConfig> = new ModuleConfig(
        {
            gridRange: GridRange.serialize(INITIAL_GRID_RANGE),
            maxIterations: 0,
            interpolate: false,
            precision: false,
            referenceCoordinate: '',
            useLogColourScaling: false,
            gradient: {
                supportPoints: '0:#000000, 0.5:#FFFFFF, 1:#000000',
                easing: Easing.RGB_LINEAR,
                scaling: 1,
            },
            fallbackColour: '#000000',
        },
        'mandelbrotIterationsConfig',
        [
            CREATE.UI_FIELD_HEADER_FRACTAL,
            CREATE.uiFieldFractalMaxIterations('maxIterations'),
            CREATE.uiFieldFractalInterpolate('interpolate'),
            CREATE.uiFieldFractalPrecision('precision'),
            CREATE.uiFieldFractalReferenceCoordinate('referenceCoordinate'),
            CREATE.UI_FIELD_HEADER_GRADIENT,
            CREATE.uiFieldUseLogColourScaling('useLogColourScaling'),
            CREATE.uiFieldGradientSupportPoints('gradient.supportPoints'),
            CREATE.uiFieldGradientEasing('gradient.easing'),
            CREATE.uiFieldGradientScaling('gradient.scaling'),
            CREATE.uiFieldFallbackColour('fallbackColour'),
        ],
    );

    override refresh() {
        this.calculate();
    }

    private async calculate() {
        this._effectiveMaxIterations = estimateMaxIterations(this.config.data.maxIterations, GridRange.rangeXdiff(INITIAL_GRID_RANGE), this.grid.xDiff);
        console.log(`#calculate - with max iterations ${this._effectiveMaxIterations}`);

        this.resetProgress();
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
        const colourMapper = ColourMapper.fromString(this.config.data.gradient.supportPoints, this.config.data.gradient.easing);
        const fallbackColour = Colour.stringToRgb(this.config.data.fallbackColour);

        for (let row = 0; row < this.grid.height; row++) {
            for (let col = 0; col < this.grid.width; col++) {
                const index = this.grid.getIndex(col, row);
                let value = (this.config.data.useLogColourScaling)
                    ? shapeIterationCountForColour(data[index], this._effectiveMaxIterations)
                    : data[index];

                this.setPixel(
                    imageData,
                    index,
                    (value >= this._effectiveMaxIterations)
                        ? fallbackColour
                        : colourMapper.mapLooped(value, 255 * this.config.data.gradient.scaling),
                );
            }
        }
        return imageData;
    }
}