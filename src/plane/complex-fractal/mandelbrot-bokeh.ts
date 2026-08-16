import { lastValueFrom } from 'rxjs';
import { Colour } from '../../../shared/colour/colour';
import { ColourMapper, ColourMapperConfig, Easing } from '../../../shared/colour/colour-mapper';
import { ModuleConfig } from '../../../shared/config';
import { InitializeAfterConstruct } from '../../../shared/initializable';
import { GridRange } from '../../grid/grid-range';
import { BokehProcessor } from '../../math/bokeh/bokeh-processor';
import { BokehConfig, BokehType } from '../../math/bokeh/types';
import { MandelbrotCalculator } from '../../math/complex-fractal/mandelbrot-calculator';
import { BigDecimal } from '../../types/big-decimal';
import { Plane, PlaneConfig } from '../plane';
import { CREATE } from '../ui/plane-config-field-creator';
import { estimateMaxIterations } from './estimate-max-iterations';
import { shapeIterationCountForColour } from './shape-iteration-count-for-colour';

interface MandelbrotBokehConfig extends PlaneConfig {
    maxIterations: number,
    interpolate: boolean,
    precision: boolean,
    referenceCoordinate: string,
    useLogColourScaling: boolean,
    gradient: ColourMapperConfig,
    fallbackColour: string,
    zRange: number;
    zGamma: number;
    bokehConfig: BokehConfig,
}

const INITIAL_GRID_RANGE: GridRange = { xMin: BigDecimal.fromNumber(-3), xMax: BigDecimal.fromNumber(1.8), yCenter: BigDecimal.ZERO };

@InitializeAfterConstruct()
export class MandelbrotBokeh extends Plane {

    private _effectiveMaxIterations = 255;

    override config: ModuleConfig<MandelbrotBokehConfig> = new ModuleConfig(
        {
            gridRange: GridRange.serialize(INITIAL_GRID_RANGE),
            maxIterations: 0,
            interpolate: true,
            precision: false,
            referenceCoordinate: '',
            useLogColourScaling: false,
            gradient: {
                supportPoints: '0:#f2ebdc, 0.2:#d2aa78, 0.4:#824a25, 0.6:#412313, 0.8:#faf5ed, 1:#f2ebdc',
                easing: Easing.RGB_LINEAR,
                scaling: 0.1,
                offset: 0,
            },
            fallbackColour: '#000',
            zRange: 5,
            zGamma: 1,
            bokehConfig: {
                type: BokehType.SOFT_DISC,
                maxBlurRadius: 5,
                pixelsPerZUnit: 6,
                focusZ: 0,
                focusRange: 2,
                edgeSoftnessPx: 1,
                bladeCount: 5,
                apertureRotation: 0,
                innerRadiusRatio: 0.6,
                rimIntensity: 3,
            },
        },
        'mandelbrotBokehConfig',
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
            CREATE.uiFieldGradientOffset('gradient.offset'),
            CREATE.uiFieldFallbackColour('fallbackColour'),
            CREATE.UI_FIELD_HEADER_BOKEH,
            CREATE.createFloatField('zRange', 'Z Range', undefined, 0.1, 10),
            CREATE.createFloatField('zGamma', 'Z Gamma', 'flattens the curve near the solid', 0.1, 10),
            CREATE.uiFieldBokehType('bokehConfig.type'),
            CREATE.uiFieldBokehMaxBlurRadius('bokehConfig.maxBlurRadius'),
            CREATE.uiFieldBokehPixelsPerZUnit('bokehConfig.pixelsPerZUnit'),
            CREATE.uiFieldBokehFocusZ('bokehConfig.focusZ'),
            CREATE.uiFieldBokehFocusRange('bokehConfig.focusRange'),
            CREATE.uiFieldBokehEdgeSoftnessPx('bokehConfig.edgeSoftnessPx'),
            CREATE.uiFieldBokehBladeCount('bokehConfig.bladeCount'),
            CREATE.uiFieldBokehApertureRotation('bokehConfig.apertureRotation'),
            CREATE.uiFieldBokehInnerRadiusRatio('bokehConfig.innerRadiusRatio'),
            CREATE.uiFieldBokehRimIntensity('bokehConfig.rimIntensity'),
        ],
    );

    override refresh() {
        this.calculate();
    }

    private async calculate() {
        this._effectiveMaxIterations = estimateMaxIterations(this.config.data.maxIterations, GridRange.rangeXdiff(INITIAL_GRID_RANGE), this.grid.xDiff);
        console.log(`#calculate - with max iterations ${this._effectiveMaxIterations}`);

        this.resetProgress();

        // Create Source Field Input
        const calculator = new MandelbrotCalculator();
        let colourData: Uint8ClampedArray;
        const calculationIterations$ = this.config.data.interpolate
            ? calculator.calculateSmoothIterations(this.grid, this._effectiveMaxIterations, this.config.data.precision, this.config.data.referenceCoordinate)
            : calculator.calculateIterations(this.grid, this._effectiveMaxIterations, this.config.data.precision, this.config.data.referenceCoordinate);
        calculationIterations$.subscribe({ next: (state) => { this.setProgress(state.progress, 'Iterations 1/2'); } });
        const iterationData = await lastValueFrom(calculationIterations$);
        if (iterationData.data != null) {
            colourData = this.createImageFromIterationData(iterationData.data);
            this.updateImage(structuredClone(colourData) as ImageDataArray);
            this.setIdle();
        } else {
            console.error('#calculate - calculation did not produce data');
            this.setIdle();
            return;
        }

        // Apply Bokeh
        const processor = new BokehProcessor();
        const calculationBokeh$ = processor.process({
            grid: this.grid,
            colourData: colourData,
            zData: Float32Array.from(iterationData.data, (data) => this.mandelbrotToZ(data, this._effectiveMaxIterations)),
            coverageData: new Uint8ClampedArray(this.grid.size).fill(255),
        }, this.config.data.bokehConfig);
        calculationBokeh$.subscribe({ next: (state) => { this.setProgress(state.progress, 'Bokeh 2/2'); } });
        const result = await lastValueFrom(calculationBokeh$);
        if (result.data != null) {
            this.updateImage(result.data as ImageDataArray);
            this.setIdle();
        } else {
            console.error('#calculate - calculation did not produce data');
        }
    }

    private createImageFromIterationData(data: Float64Array): ImageDataArray {
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
                        : colourMapper.mapLooped(value, 255 * this.config.data.gradient.scaling, this.config.data.gradient.offset),
                );
            }
        }
        return imageData;
    }

    private mandelbrotToZ(iterationCount: number, maxIterations: number): number {
        const logCount = Math.log(iterationCount + 1);
        const logMax = Math.log(maxIterations + 1);
        const normalizedDistance = (logMax - logCount) / logMax;

        const shaped = Math.pow(normalizedDistance, this.config.data.zGamma);
        return shaped * this.config.data.zRange;
    }
}