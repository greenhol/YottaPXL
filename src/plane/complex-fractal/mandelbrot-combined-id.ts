import { Colour } from '../../../shared/colour/colour';
import { blender, BlendingType } from '../../../shared/colour/colour-blender';
import { ColourMapper, ColourMapperConfig, Easing } from '../../../shared/colour/colour-mapper';
import { ModuleConfig } from '../../../shared/config';
import { InitializeAfterConstruct } from '../../../shared/initializable';
import { GridRange } from '../../grid/grid-range';
import { MandelbrotCalculator } from '../../math/complex-fractal/mandelbrot-calculator';
import { BigDecimal } from '../../types/big-decimal';
import { extractData } from '../../worker/extract-data';
import { Plane, PlaneConfig } from '../plane';
import { CREATE } from '../ui/plane-config-field-creator';
import { estimateMaxIterations } from './estimate-max-iterations';

interface MandelbrotCombinedIdConfig extends PlaneConfig {
    maxIterations: number,
    interpolate: boolean,
    escapeValue: number,
    gradientIterations: ColourMapperConfig,
    gradientDistance: ColourMapperConfig,
    fallbackColour: string,
    blending: BlendingType,
}

const INITIAL_GRID_RANGE: GridRange = { xMin: BigDecimal.fromNumber(-3), xMax: BigDecimal.fromNumber(1.8), yCenter: BigDecimal.ZERO };

@InitializeAfterConstruct()
export class MandelbrotCombinedID extends Plane {

    private _effectiveMaxIterations = 255;

    override config: ModuleConfig<MandelbrotCombinedIdConfig> = new ModuleConfig(
        {
            gridRange: GridRange.serialize(INITIAL_GRID_RANGE),
            maxIterations: 0,
            interpolate: false,
            escapeValue: 100,
            gradientIterations: {
                supportPoints: '0:#00FF00, 0.5:#88FF88, 1:#00FF00',
                easing: Easing.RGB_LINEAR,
                scaling: 1,
                offset: 0,
            },
            gradientDistance: {
                supportPoints: '0:#FFFFFF, 0.4:#FFFFFF, 0.5:#000000, 0.6:#FFFFFF, 1:#FFFFFF',
                easing: Easing.RGB_LINEAR,
                scaling: 0.1,
                offset: 0,
            },
            fallbackColour: '#000000',
            blending: BlendingType.INTENSITY,
        },
        'mandelbrotCombinedIdConfig',
        [
            CREATE.UI_FIELD_HEADER_FRACTAL,
            CREATE.uiFieldFractalMaxIterations('maxIterations'),
            CREATE.uiFieldFractalInterpolate('interpolate'),
            CREATE.uiFieldFractalEscapeValue('escapeValue'),
            CREATE.createHeader('Iterations', 'Gradient looped'),
            CREATE.uiFieldGradientSupportPoints('gradientIterations.supportPoints'),
            CREATE.uiFieldGradientEasing('gradientIterations.easing'),
            CREATE.uiFieldGradientScaling('gradientIterations.scaling'),
            CREATE.uiFieldGradientOffset('gradientIterations.offset'),
            CREATE.createHeader('Distance', 'Gradient looped'),
            CREATE.uiFieldGradientSupportPoints('gradientDistance.supportPoints'),
            CREATE.uiFieldGradientEasing('gradientDistance.easing'),
            CREATE.uiFieldGradientScaling('gradientDistance.scaling'),
            CREATE.uiFieldGradientOffset('gradientDistance.offset'),
            CREATE.uiFieldFallbackColour('fallbackColour'),
            CREATE.UI_FIELD_HEADER_BLENDING,
            CREATE.uiFieldColourBlending('blending'),
        ],
    );

    override refresh() {
        this.calculate();
    }

    private async calculate() {
        this._effectiveMaxIterations = estimateMaxIterations(this.config.data.maxIterations, GridRange.rangeXdiff(INITIAL_GRID_RANGE), this.grid.xDiff);
        console.log(`#calculate - with max iterations ${this._effectiveMaxIterations}`);

        this.resetProgress();
        // Iterations
        const calculator = new MandelbrotCalculator();
        const calculationIterations$ = this.config.data.interpolate
            ? calculator.calculateSmoothIterations(this.grid, this._effectiveMaxIterations)
            : calculator.calculateIterations(this.grid, this._effectiveMaxIterations);
        calculationIterations$.subscribe({ next: (state) => { this.setProgress(state.progress, 'Iterations 1/2'); } });
        const iterationsData = await extractData(calculationIterations$, 'mandelbrot iterations');

        // Distances
        const calculationDistances$ = calculator.calculateDistances(this.grid, this._effectiveMaxIterations, this.config.data.escapeValue);
        calculationDistances$.subscribe({ next: (state) => { this.setProgress(state.progress, 'Distances 2/2'); } });
        const distancesData = await extractData(calculationDistances$, 'mandelbrot distances');

        this.updateImage(this.createImage(iterationsData, distancesData));
        this.setIdle();
    }

    private createImage(iterations: Float64Array, distances: Float64Array): ImageDataArray {
        const imageData = new Uint8ClampedArray(this.grid.size * 4);
        const colourMapperIterations = ColourMapper.fromString(this.config.data.gradientIterations.supportPoints, this.config.data.gradientIterations.easing);
        let max = 0;
        distances.forEach(value => { if (value > max) max = value; });
        const colourMapperDistances = ColourMapper.fromString(this.config.data.gradientDistance.supportPoints, this.config.data.gradientDistance.easing);
        const fallbackColour = Colour.stringToRgb(this.config.data.fallbackColour);

        for (let row = 0; row < this.grid.height; row++) {
            for (let col = 0; col < this.grid.width; col++) {
                const index = this.grid.getIndex(col, row);
                const valueIterations = iterations[index];
                this.setPixel(
                    imageData,
                    index,
                    (valueIterations === this._effectiveMaxIterations) ?
                        fallbackColour :
                        blender.blend(
                            colourMapperIterations.mapLooped(valueIterations, 255 * this.config.data.gradientIterations.scaling, this.config.data.gradientIterations.offset),
                            colourMapperDistances.mapLooped(distances[index], max * this.config.data.gradientDistance.scaling, this.config.data.gradientDistance.offset),
                            this.config.data.blending,
                        ),
                );
            }
        }
        return imageData;
    }
}