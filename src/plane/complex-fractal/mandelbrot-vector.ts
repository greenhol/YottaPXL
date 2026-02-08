import { ModuleConfig } from '../../config/module-config';
import { Grid } from '../../grid/grid';
import { GridRange } from '../../grid/grid-range';
import { GridWithMargin } from '../../grid/grid-with-margin';
import { MandelbrotCalculator } from '../../math/complex-fractal/mandelbrot-calculator';
import { LicCalculator } from '../../math/lic/lic-calculator';
import { NoiseGenerator } from '../../math/noise-generator/noise-generator';
import { MandelbrotField } from '../../math/vector-field/mandelbrot-field';
import { SourceData } from '../../math/vector-field/vector-field';
import { BLACK, Color, createGray, WHITE } from '../../utils/color';
import { ColorMapper } from '../../utils/color-mapper';
import { Plane, PlaneConfig } from '../plane';

interface MandelbrotVectorConfig extends PlaneConfig {
    gridRange: GridRange,
    maxIterations: number,
    useNoiseAsSource: boolean,
}

const COLOR_NA: Color = { r: 0, g: 0, b: 0 };
const INITIAL_GRID_RANGE: GridRange = { xMin: -3, xMax: 1.8, yCenter: 0 };
const LIC_MAX_LENGTH: number = 10;

export class MandelbrotVector extends Plane {

    constructor(grid: Grid) {
        super(grid);
        this.calculate();
    }

    override config: ModuleConfig<MandelbrotVectorConfig> = new ModuleConfig(
        {
            gridRange: INITIAL_GRID_RANGE,
            maxIterations: 255,
            useNoiseAsSource: true,
        },
        'mandelbrotVectorConfig',
    );

    override updateGridRange(selectedRange: GridRange | null) {
        if (selectedRange != null) {
            this.config.data.gridRange = selectedRange;
        } else {
            this.config.reset();
        }
        this.calculate();
    }

    private calculate() {
        this.setBusy();
        const range = this.config.data.gridRange;
        this.grid.updateRange(range);

        const maxIterations = 2000;
        const escapeValue = 1000;

        const sourceGrid = new GridWithMargin(this.grid.resolution, range, 2 * LIC_MAX_LENGTH);
        const sourceField = new MandelbrotField(sourceGrid, maxIterations, escapeValue);

        // ToDo: remove setTimeouts when web workers are 
        setTimeout(() => {
            const generator = new NoiseGenerator(sourceGrid);
            const sourceData: SourceData = {
                grid: sourceGrid,
                field: sourceField,
                data: this.config.data.useNoiseAsSource ?
                    generator.createBernoulliNoise(0.3) :
                    this.createMandelbrotData(sourceGrid, maxIterations, escapeValue),
            }
            this.updateImage(this.drawSourceImage(sourceData));

            setTimeout(() => {
                const calculator: LicCalculator = new LicCalculator(sourceData, this.grid);
                const licData = calculator.calculate(LIC_MAX_LENGTH);
                this.updateImage(this.drawImage(licData));

                setTimeout(() => {
                    this.setIdle();
                }, 50);
            }, 50);
        }, 50);
    }

    private createMandelbrotData(gridWithMargin: GridWithMargin, maxIterations: number, escapeValue: number): Float64Array {
        const calc = new MandelbrotCalculator(escapeValue);
        const colorMapper = new ColorMapper([
            { color: BLACK, cycleLength: 255 },
            { color: WHITE, cycleLength: 255 },
        ]);
        const mbData = calc.calculateIterations(gridWithMargin, maxIterations);
        const data = new Float64Array(gridWithMargin.size);
        for (let row = 0; row < gridWithMargin.height; row++) {
            for (let col = 0; col < gridWithMargin.width; col++) {
                let value = mbData[gridWithMargin.getIndex(col, row)];
                if (value === maxIterations) {
                    value = -1;
                }
                data[gridWithMargin.getIndex(col, row)] = colorMapper.map(value).r / 255;
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
                let value = Math.round(source.data[sourceIndex] * 255);
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