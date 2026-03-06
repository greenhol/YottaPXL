import { lastValueFrom } from 'rxjs';
import { ModuleConfig } from '../../config/module-config';
import { GridRange, rangeXdiff } from '../../grid/grid-range';
import { GridWithMargin } from '../../grid/grid-with-margin';
import { MandelbrotCalculator } from '../../math/complex-fractal/mandelbrot-calculator';
import { LicCalculator, SourceData } from '../../math/lic/lic-calculator';
import { NoiseGenerator } from '../../math/noise-generator/noise-generator';
import { VectorFieldGenerator } from '../../math/vector-field/vector-field-generator';
import { BLACK, Color, createGray, WHITE } from '../../utils/color';
import { ColorMapper } from '../../utils/color-mapper';
import { InitializeAfterConstruct } from '../../utils/initializable';
import { extractData } from '../../worker/extract-data';
import { Plane, PlaneConfig } from '../plane';
import { estimateMaxIterations } from './estimate-max-iterations';

interface MandelbrotVectorConfig extends PlaneConfig {
    gridRange: GridRange,
    maxIterations: number,
    escapeValue: number,
    licLength: number,
    useNoiseAsSource: boolean,
}

const COLOR_NA: Color = { r: 0, g: 0, b: 0 };
const INITIAL_GRID_RANGE: GridRange = { xMin: -3, xMax: 1.8, yCenter: 0 };

@InitializeAfterConstruct()
export class MandelbrotVector extends Plane {

    private _effectiveMaxIterations = 255;

    override config: ModuleConfig<MandelbrotVectorConfig> = new ModuleConfig(
        {
            gridRange: INITIAL_GRID_RANGE,
            maxIterations: 0,
            escapeValue: 100,
            licLength: 5,
            useNoiseAsSource: true,
        },
        'mandelbrotVectorConfig',
    );

    public init(): void {
        this.grid.updateRange(this.config.data.gridRange);
        this.refresh();
    }

    override refresh() {
        this.calculate();
    }

    private async calculate() {
        this._effectiveMaxIterations = estimateMaxIterations(this.config.data.maxIterations, rangeXdiff(INITIAL_GRID_RANGE), this.grid.xDiff);
        console.log(`#calculate - with max iterations ${this._effectiveMaxIterations}`);

        this.setProgress(0);
        const range = this.config.data.gridRange;
        this.grid.updateRange(range);

        // Create Source Field Input
        const sourceGrid = new GridWithMargin(this.grid.resolution, range, 2 * this.config.data.licLength);
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
        const generator$ = generator.createBernoulliNoise(0.3);
        return await extractData(generator$, 'noise');
    }

    private async createMandelbrotData(sourceGrid: GridWithMargin, maxIterations: number): Promise<Float64Array> {
        const colorMapper = new ColorMapper([
            { color: BLACK, cycleLength: 255 },
            { color: WHITE, cycleLength: 255 },
        ]);
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
                data[sourceGrid.getIndex(col, row)] = colorMapper.map(value).r / 255;
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
                this.drawPixel(imageData, index, (value == Number.MIN_SAFE_INTEGER) ? COLOR_NA : createGray(value));
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