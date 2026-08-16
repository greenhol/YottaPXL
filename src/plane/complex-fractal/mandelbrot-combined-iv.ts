import { lastValueFrom } from 'rxjs';
import { Colour } from '../../../shared/colour/colour';
import { blender, BlendingType } from '../../../shared/colour/colour-blender';
import { ColourMapper, ColourMapperConfig, Easing } from '../../../shared/colour/colour-mapper';
import { ModuleConfig } from '../../../shared/config';
import { InitializeAfterConstruct } from '../../../shared/initializable';
import { GridRange, GridRangeSerialized } from '../../grid/grid-range';
import { GridWithMargin } from '../../grid/grid-with-margin';
import { MandelbrotCalculator } from '../../math/complex-fractal/mandelbrot-calculator';
import { LicCalculator, SourceData } from '../../math/lic/lic-calculator';
import { LicConfig } from '../../math/lic/types';
import { NoiseConfig, NoiseGenerator, NoiseType } from '../../math/noise-generator/noise-generator';
import { VectorFieldGenerator } from '../../math/vector-field/vector-field-generator';
import { BigDecimal } from '../../types/big-decimal';
import { extractData } from '../../worker/extract-data';
import { Plane, PlaneConfig } from '../plane';
import { CREATE } from '../ui/plane-config-field-creator';
import { estimateMaxIterations } from './estimate-max-iterations';
import { shapeIterationCountForColour } from './shape-iteration-count-for-colour';

interface MandelbrotCombinedIvConfig extends PlaneConfig {
    maxIterations: number,
    interpolate: boolean,
    escapeValue: number,
    noiseConfig: NoiseConfig,
    licConfig: LicConfig,
    useLogColourScaling: boolean,
    gradientIterations: ColourMapperConfig,
    gradientStreamlines: ColourMapperConfig,
    fallbackColour: string,
    blending: BlendingType,
}

const INITIAL_GRID_RANGE: GridRange = { xMin: BigDecimal.fromNumber(-3), xMax: BigDecimal.fromNumber(1.8), yCenter: BigDecimal.ZERO };

@InitializeAfterConstruct()
export class MandelbrotCombinedIV extends Plane {

    private _effectiveMaxIterations = 255;

    override config: ModuleConfig<MandelbrotCombinedIvConfig> = new ModuleConfig(
        {
            gridRange: GridRange.serialize(INITIAL_GRID_RANGE),
            maxIterations: 0,
            interpolate: false,
            escapeValue: 100,
            noiseConfig: {
                seed: null,
                type: NoiseType.BERNOULLI_ISOLATED,
                p: 0.3,
                scaling: 2,
            },
            licConfig: {
                minLength: 1,
                maxLength: 5,
                strength: -1,
            },
            useLogColourScaling: false,
            gradientIterations: {
                supportPoints: '0:#FFFFFF, 0.1:#B1BCBE, 0.4:#405F26, 0.6:#2F4F20, 0.9:#B1BCBE, 1:#FFFFFF',
                easing: Easing.RGB_BALANCED,
                scaling: 1,
                offset: 0,
            },
            gradientStreamlines: {
                supportPoints: '0:#FFFF88, 1:#FFFFFF',
                easing: Easing.RGB_LINEAR,
                scaling: 1,
                offset: 0,
            },
            fallbackColour: '#000000',
            blending: BlendingType.HSL,
        },
        'mandelbrotCombinedIvConfig',
        [
            CREATE.UI_FIELD_HEADER_FRACTAL,
            CREATE.uiFieldFractalMaxIterations('maxIterations'),
            CREATE.uiFieldFractalInterpolate('interpolate'),
            CREATE.uiFieldFractalEscapeValue('escapeValue'),
            CREATE.createHeader('Source Noise'),
            CREATE.uiFieldSeed('noiseConfig.seed'),
            CREATE.uiFieldNoiseType('noiseConfig.type'),
            CREATE.uiFieldNoiseP('noiseConfig.p'),
            CREATE.uiFieldNoiseScaling('noiseConfig.scaling'),
            CREATE.UI_FIELD_HEADER_LIC,
            CREATE.uiFieldLicLenth('licConfig.maxLength'),
            CREATE.createHeader('Iterations', 'Gradient looped'),
            CREATE.uiFieldGradientSupportPoints('gradientIterations.supportPoints'),
            CREATE.uiFieldGradientEasing('gradientIterations.easing'),
            CREATE.uiFieldGradientScaling('gradientIterations.scaling'),
            CREATE.uiFieldGradientOffset('gradientIterations.offset'),
            CREATE.createHeader('Streamlines', 'Gradient clapmed'),
            CREATE.uiFieldUseLogColourScaling('useLogColourScaling'),
            CREATE.uiFieldGradientSupportPoints('gradientStreamlines.supportPoints'),
            CREATE.uiFieldGradientEasing('gradientStreamlines.easing'),
            CREATE.uiFieldGradientScaling('gradientStreamlines.scaling'),
            CREATE.uiFieldGradientOffset('gradientStreamlines.offset'),
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

        // Create Source Field Input
        const sourceGrid = new GridWithMargin(this.grid.resolution, GridRangeSerialized.deserialize(this.config.data.gridRange), 2 * this.config.data.licConfig.maxLength);
        const mandelbrotCalculator = new MandelbrotCalculator();
        const mandelbrotCalculation$ = mandelbrotCalculator.calculateDistances(
            sourceGrid,
            this._effectiveMaxIterations,
            this.config.data.escapeValue,
        );
        mandelbrotCalculation$.subscribe({ next: (state) => { this.setProgress(state.progress, 'Source Input 1/4'); } });
        const mandelbrotDistances = await extractData(mandelbrotCalculation$, 'mandelbrot distances');

        // Create Source Field
        const fieldGenerator = new VectorFieldGenerator(sourceGrid);
        const fieldCalculation$ = fieldGenerator.createMatrixGradientField(mandelbrotDistances, 0, this._effectiveMaxIterations);
        fieldCalculation$.subscribe({ next: (state) => { this.setProgress(state.progress, 'Source Field 2/4'); } });
        const field = await extractData(fieldCalculation$, 'charges field');

        // Create Source Image
        const sourceData: SourceData = {
            grid: sourceGrid,
            image: await this.createNoise(sourceGrid),
            field: field,
        };
        this.updateImage(this.drawSourceImage(sourceData));

        // Iterations
        const calculationIterations$ = this.config.data.interpolate
            ? mandelbrotCalculator.calculateSmoothIterations(this.grid, this._effectiveMaxIterations)
            : mandelbrotCalculator.calculateIterations(this.grid, this._effectiveMaxIterations);
        calculationIterations$.subscribe({ next: (state) => { this.setProgress(state.progress, 'Iterations 3/4'); } });
        const iterationsData = await extractData(calculationIterations$, 'mandelbrot iterations');

        // LIC
        const licCalculator = new LicCalculator(sourceData, this.grid);
        const licCalculation$ = licCalculator.calculate(this.config.data.licConfig);
        licCalculation$.subscribe({
            next: (state) => { this.setProgress(state.progress, 'LIC 4/4'); }
        });
        const licResult = await lastValueFrom(licCalculation$);
        if (licResult.data != null) {
            this.updateImage(this.createImage(iterationsData, licResult.data));
            this.setIdle();
        } else {
            console.error('#calculateAndDraw - calculation did not produce data');
        }
    }

    private async createNoise(sourceGrid: GridWithMargin): Promise<Float32Array> {
        const generator = new NoiseGenerator(sourceGrid);
        const generator$ = generator.createNoise(this.config.data.noiseConfig);
        return await extractData(generator$, 'noise');
    }

    private drawSourceImage(source: SourceData): ImageDataArray {
        const imageData = new Uint8ClampedArray(this.grid.size * 4);
        for (let row = 0; row < this.grid.height; row++) {
            for (let col = 0; col < this.grid.width; col++) {
                const sourceIndex = source.grid.getIndexForCenterArea(col, row);
                const targetIndex = this.grid.getIndex(col, row);
                let value = Math.round(source.image[sourceIndex] * 255);
                this.setPixel(imageData, targetIndex, { r: value, g: value, b: value });
            }
        }
        return imageData;
    }

    private createImage(iterations: Float64Array, field: Float64Array): ImageDataArray {
        const imageData = new Uint8ClampedArray(this.grid.size * 4);
        const colourMapperIterations = ColourMapper.fromString(this.config.data.gradientIterations.supportPoints, this.config.data.gradientIterations.easing);
        const colourMapperStreamlines = ColourMapper.fromString(this.config.data.gradientStreamlines.supportPoints, this.config.data.gradientStreamlines.easing);
        const fallbackColour = Colour.stringToRgb(this.config.data.fallbackColour);

        for (let row = 0; row < this.grid.height; row++) {
            for (let col = 0; col < this.grid.width; col++) {
                const index = this.grid.getIndex(col, row);
                let valueIterations = (this.config.data.useLogColourScaling)
                    ? shapeIterationCountForColour(iterations[index], this._effectiveMaxIterations)
                    : iterations[index];

                this.setPixel(
                    imageData,
                    index,
                    (valueIterations === this._effectiveMaxIterations) ?
                        fallbackColour :
                        blender.blend(
                            colourMapperIterations.mapLooped(valueIterations, 255 * this.config.data.gradientIterations.scaling, this.config.data.gradientIterations.offset),
                            colourMapperStreamlines.mapClamped(field[index], this.config.data.gradientStreamlines.scaling, this.config.data.gradientStreamlines.offset),
                            this.config.data.blending,
                        )
                );
            }
        }
        return imageData;
    }
}