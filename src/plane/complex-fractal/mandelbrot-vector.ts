import { lastValueFrom } from 'rxjs';
import { InitializeAfterConstruct } from '../../../shared';
import { ModuleConfig, UiFieldBool } from '../../../shared/config';
import { GridRange, rangeXdiff } from '../../grid/grid-range';
import { GridWithMargin } from '../../grid/grid-with-margin';
import { ColorMapper } from '../../math/color/color-mapper';
import { MandelbrotCalculator } from '../../math/complex-fractal/mandelbrot-calculator';
import { LicCalculator, SourceData } from '../../math/lic/lic-calculator';
import { NoiseConfig, NoiseGenerator, NoiseType } from '../../math/noise-generator/noise-generator';
import { NoiseScaleFactor } from '../../math/noise-generator/types';
import { VectorFieldGenerator } from '../../math/vector-field/vector-field-generator';
import { Color, COLORS, createGrey } from '../../types';
import { extractData } from '../../worker/extract-data';
import { Plane, PlaneConfig } from '../plane';
import { UI_SCHEMA_HEADER_FRACTAL, UI_SCHEMA_HEADER_LIC, uiSchemaFractalEscapeValue, uiSchemaFractalMaxIterations, uiSchemaHeader, uiSchemaLicLenth, uiSchemaNoiseP, uiSchemaNoiseScaling, uiSchemaNoiseType } from '../ui-schema/ui-fields';
import { estimateMaxIterations } from './estimate-max-iterations';

interface MandelbrotVectorConfig extends PlaneConfig {
    useNoiseAsSource: boolean,
    noiseConfig: NoiseConfig,
    maxIterations: number,
    escapeValue: number,
    licLength: number,
}

const COLOR_NA: Color = { r: 0, g: 0, b: 0 };
const INITIAL_GRID_RANGE: GridRange = { xMin: -3, xMax: 1.8, yCenter: 0 };

@InitializeAfterConstruct()
export class MandelbrotVector extends Plane {

    private _effectiveMaxIterations = 255;

    override config: ModuleConfig<MandelbrotVectorConfig> = new ModuleConfig(
        {
            gridRange: INITIAL_GRID_RANGE,
            useNoiseAsSource: true,
            noiseConfig: {
                type: NoiseType.BERNOULLI_ISOLATED,
                p: 0.3,
                scaling: NoiseScaleFactor.TWO,
            },
            maxIterations: 0,
            escapeValue: 100,
            licLength: 5,
        },
        'mandelbrotVectorConfig',
        [
            uiSchemaHeader('Source Image'),
            new UiFieldBool('useNoiseAsSource', 'Noise Input', 'Use noise as input (Mandelbrot iteration image otherwise)'),
            uiSchemaNoiseType('noiseConfig.type'),
            uiSchemaNoiseP('noiseConfig.p'),
            uiSchemaNoiseScaling('noiseConfig.scaling'),
            UI_SCHEMA_HEADER_FRACTAL,
            uiSchemaFractalMaxIterations('maxIterations'),
            uiSchemaFractalEscapeValue('escapeValue'),
            UI_SCHEMA_HEADER_LIC,
            uiSchemaLicLenth('licLength'),
        ],
    );

    override refresh() {
        this.calculate();
    }

    private async calculate() {
        this._effectiveMaxIterations = estimateMaxIterations(this.config.data.maxIterations, rangeXdiff(INITIAL_GRID_RANGE), this.grid.xDiff);
        console.log(`#calculate - with max iterations ${this._effectiveMaxIterations}`);

        this.setProgress(0);

        // Create Source Field Input
        const sourceGrid = new GridWithMargin(this.grid.resolution, this.config.data.gridRange, 2 * this.config.data.licLength);
        const mandelbrotCalculator = new MandelbrotCalculator();
        const mandelbrotCalculation$ = mandelbrotCalculator.calculateDistances(
            sourceGrid,
            this._effectiveMaxIterations,
            this.config.data.escapeValue,
        )
        mandelbrotCalculation$.subscribe({ next: (state) => { this.setProgress(state.progress, 'Source Input 1/4') } });
        const mandelbrotDistances = await extractData(mandelbrotCalculation$, 'mandelbrot distances');

        // Create Source Field
        const fieldGenerator = new VectorFieldGenerator(sourceGrid);
        const fieldCalculation$ = fieldGenerator.createMatrixGradientField(mandelbrotDistances, 0, this._effectiveMaxIterations);
        fieldCalculation$.subscribe({ next: (state) => { this.setProgress(state.progress, 'Source Field 2/4') } });
        const field = await extractData(fieldCalculation$, 'charges field');

        // Create Source Image
        const sourceData: SourceData = {
            grid: sourceGrid,
            image: this.config.data.useNoiseAsSource ?
                await this.createNoise(sourceGrid) :
                await this.createMandelbrotData(sourceGrid, this._effectiveMaxIterations),
            field: field,
        }
        this.updateImage(this.drawSourceImage(sourceData));

        // LIC
        const licCalculator = new LicCalculator(sourceData, this.grid);
        const licCalculation$ = licCalculator.calculate(this.config.data.licLength);
        licCalculation$.subscribe({
            next: (state) => { this.setProgress(state.progress, 'LIC 4/4') }
        });
        const licResult = await lastValueFrom(licCalculation$);
        if (licResult.data != null) {
            this.updateImage(this.drawImage(licResult.data));
            this.setIdle();
        } else {
            console.error('#calculateAndDraw - calculation did not produce data')
        }
    }

    private async createNoise(sourceGrid: GridWithMargin): Promise<Float64Array> {
        const generator = new NoiseGenerator(sourceGrid);
        const generator$ = generator.createNoise(this.config.data.noiseConfig);
        return await extractData(generator$, 'noise');
    }

    private async createMandelbrotData(sourceGrid: GridWithMargin, maxIterations: number): Promise<Float64Array> {
        const colorMapper = ColorMapper.fromColors(COLORS.BW);
        const mandelbrotCalculator = new MandelbrotCalculator();
        const mandelbrotCalculation$ = mandelbrotCalculator.calculateIterations(sourceGrid, maxIterations);
        mandelbrotCalculation$.subscribe({ next: (state) => { this.setProgress(state.progress, 'Source Image 3/4') } });
        const mandelbrotIterations = await extractData(mandelbrotCalculation$, 'mandelbrot iterations');

        const data = new Float64Array(sourceGrid.size);
        for (let row = 0; row < sourceGrid.height; row++) {
            for (let col = 0; col < sourceGrid.width; col++) {
                let value = mandelbrotIterations[sourceGrid.getIndex(col, row)];
                if (value === this._effectiveMaxIterations) {
                    value = -1;
                }
                data[sourceGrid.getIndex(col, row)] = colorMapper.map(value, 512).r / 255;
            }
        }
        return data;
    }

    private drawSourceImage(source: SourceData): ImageDataArray {
        const imageData = new Uint8ClampedArray(this.grid.size * 4);
        for (let row = 0; row < this.grid.height; row++) {
            for (let col = 0; col < this.grid.width; col++) {
                const sourceIndex = source.grid.getIndexForCenterArea(col, row);
                const targetIndex = this.grid.getIndex(col, row);
                let value = Math.round(source.image[sourceIndex] * 255);
                const pixelIndex = targetIndex * 4;
                imageData[pixelIndex] = value;     // R
                imageData[pixelIndex + 1] = value; // G
                imageData[pixelIndex + 2] = value; // B
                imageData[pixelIndex + 3] = 255; // A (opaque)
            }
        }
        return imageData;
    }

    private drawImage(data: Float64Array): ImageDataArray {
        const imageData = new Uint8ClampedArray(this.grid.size * 4);
        for (let row = 0; row < this.grid.height; row++) {
            for (let col = 0; col < this.grid.width; col++) {
                const index = this.grid.getIndex(col, row);
                let value = data[index];
                this.drawPixel(imageData, index, (value == Number.MIN_SAFE_INTEGER) ? COLOR_NA : createGrey(value));
            }
        }
        return imageData;
    }

    private drawPixel(imageData: Uint8ClampedArray, index: number, color: Color) {
        const pixelIndex = index * 4;
        imageData[pixelIndex] = color.r;     // R
        imageData[pixelIndex + 1] = color.g; // G
        imageData[pixelIndex + 2] = color.b; // B
        imageData[pixelIndex + 3] = 255;     // A (opaque)
    }
}