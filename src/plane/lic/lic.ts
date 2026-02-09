import { ModuleConfig } from '../../config/module-config';
import { Grid } from '../../grid/grid';
import { GridRange } from '../../grid/grid-range';
import { GridWithMargin } from '../../grid/grid-with-margin';
import { LicCalculator } from '../../math/lic/lic-calculator';
import { NoiseGenerator } from '../../math/noise-generator/noise-generator';
import { ChargeField } from '../../math/vector-field/charge-field';
import { SourceData } from '../../math/vector-field/vector-field';
import { Color, createGray, RED } from '../../utils/color';
import { Plane, PlaneConfig } from '../plane';

interface LicConfig extends PlaneConfig {
    gridRange: GridRange,
    licLength: number,
}

const INITIAL_GRID_RANGE: GridRange = { xMin: 0, xMax: 10, yCenter: 0 };

export class Lic extends Plane {

    constructor(grid: Grid) {
        super(grid);
        this.calculate();
    }

    override config: ModuleConfig<LicConfig> = new ModuleConfig(
        {
            gridRange: INITIAL_GRID_RANGE,
            licLength: 10,
        },
        'licConfig',
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

        const sourceGrid = new GridWithMargin(this.grid.resolution, range, 2 * this.config.data.licLength);
        // const sourceField = new ChargeField(sourceGrid);
        const sourceField = new ChargeField(sourceGrid);

        // ToDo: remove setTimeouts when web workers are 
        setTimeout(() => {
            const generator = new NoiseGenerator(sourceGrid);
            const sourceData: SourceData = {
                grid: sourceGrid,
                field: sourceField,
                data: generator.createIsolatedBigBlackNoise(0.1),
            }
            this.updateImage(this.createSourceImage(sourceData));

            setTimeout(() => {
                const calculator: LicCalculator = new LicCalculator(sourceData, this.grid);
                const licData = calculator.calculate(this.config.data.licLength);
                this.updateImage(this.createImage(licData));

                setTimeout(() => {
                    this.setIdle();
                }, 50);
            }, 50);
        }, 50);
    }

    private createSourceImage(source: SourceData): ImageDataArray {
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

    private createImage(data: Float64Array): ImageDataArray {
        const imageData = new Uint8ClampedArray(this.grid.size * 4);
        for (let row = 0; row < this.grid.height; row++) {
            for (let col = 0; col < this.grid.width; col++) {
                const index = this.grid.getIndex(col, row);
                let value = data[index];
                this.drawPixel(imageData, index, (value == Number.MIN_SAFE_INTEGER) ? RED : createGray(value));
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