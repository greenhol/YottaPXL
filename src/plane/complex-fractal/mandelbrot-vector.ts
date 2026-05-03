import { lastValueFrom } from 'rxjs';
import { InitializeAfterConstruct } from '../../../shared';
import { ModuleConfig } from '../../../shared/config';
import { GridRange, GridRangeSerialized } from '../../grid/grid-range';
import { GridWithMargin } from '../../grid/grid-with-margin';
import { ColorMapper, ColorMapperConfig, Easing } from '../../math/color/color-mapper';
import { MandelbrotCalculator } from '../../math/complex-fractal/mandelbrot-calculator';
import { LicCalculator, SourceData } from '../../math/lic/lic-calculator';
import { NoiseConfig, NoiseGenerator, NoiseType } from '../../math/noise-generator/noise-generator';
import { NoiseScaleFactor } from '../../math/noise-generator/types';
import { VectorFieldGenerator } from '../../math/vector-field/vector-field-generator';
import { BigDecimal, stringToRgb } from '../../types';
import { extractData } from '../../worker/extract-data';
import { Plane, PlaneConfig } from '../plane';
import { CREATE } from '../ui/plane-config-field-creator';
import { LicConfig } from './../../math/lic/types';
import { estimateMaxIterations } from './estimate-max-iterations';

interface MandelbrotVectorConfig extends PlaneConfig {
    noiseConfig: NoiseConfig,
    maxIterations: number,
    interpolate: boolean,
    escapeValue: number,
    licConfig: LicConfig,
    gradient: ColorMapperConfig,
    fallbackColor: string,
}

const INITIAL_GRID_RANGE: GridRange = { xMin: BigDecimal.fromNumber(-3), xMax: BigDecimal.fromNumber(1.8), yCenter: BigDecimal.ZERO };

@InitializeAfterConstruct()
export class MandelbrotVector extends Plane {

    private _effectiveMaxIterations = 255;

    override config: ModuleConfig<MandelbrotVectorConfig> = new ModuleConfig(
        {
            gridRange: GridRange.serialize(INITIAL_GRID_RANGE),
            noiseConfig: {
                type: NoiseType.BERNOULLI_ISOLATED,
                p: 0.3,
                scaling: NoiseScaleFactor.TWO,
            },
            maxIterations: 0,
            interpolate: false,
            escapeValue: 100,
            licConfig: {
                minLength: 5,
                maxLength: 5,
                strength: -1,
            },
            gradient: {
                supportPoints: '0:#000000, 1:#FFFFFF',
                easing: Easing.RGB_LINEAR,
                scaling: 1,
            },
            fallbackColor: '#000000',
        },
        'mandelbrotVectorConfig',
        [
            CREATE.createHeader('Source Image'),
            CREATE.uiFieldNoiseType('noiseConfig.type'),
            CREATE.uiFieldNoiseP('noiseConfig.p'),
            CREATE.uiFieldNoiseScaling('noiseConfig.scaling'),
            CREATE.UI_FIELD_HEADER_FRACTAL,
            CREATE.uiFieldFractalMaxIterations('maxIterations'),
            CREATE.uiFieldFractalInterpolate('interpolate'),
            CREATE.uiFieldFractalEscapeValue('escapeValue'),
            CREATE.UI_FIELD_HEADER_LIC,
            CREATE.uiFieldLicLenth('licConfig.maxLength'),
            CREATE.UI_FIELD_HEADER_GRADIENT,
            CREATE.uiFieldGradientSupportPoints('gradient.supportPoints'),
            CREATE.uiFieldGradientEasing('gradient.easing'),
            CREATE.uiFieldFallbackColor('fallbackColor'),
        ],
    );

    override refresh() {
        this.calculate();
    }

    private async calculate() {
        this._effectiveMaxIterations = estimateMaxIterations(this.config.data.maxIterations, GridRange.rangeXdiff(INITIAL_GRID_RANGE), this.grid.xDiff);
        console.log(`#calculate - with max iterations ${this._effectiveMaxIterations}`);

        this.setProgress(0);

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

        // LIC
        const licCalculator = new LicCalculator(sourceData, this.grid);
        const licCalculation$ = licCalculator.calculate(this.config.data.licConfig);
        licCalculation$.subscribe({
            next: (state) => { this.setProgress(state.progress, 'LIC 4/4'); }
        });
        const licResult = await lastValueFrom(licCalculation$);
        if (licResult.data != null) {
            this.updateImage(this.drawImage(licResult.data));
            this.setIdle();
        } else {
            console.error('#calculateAndDraw - calculation did not produce data');
        }
    }

    private async createNoise(sourceGrid: GridWithMargin): Promise<Float64Array> {
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

    private drawImage(data: Float64Array): ImageDataArray {
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
                    (value == Number.MIN_SAFE_INTEGER) ? fallbackColor : colorMapper.mapClamped(value));
            }
        }
        return imageData;
    }
}
