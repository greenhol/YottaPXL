import { lastValueFrom } from 'rxjs';
import { ModuleConfig } from '../../config/module-config';
import { Grid } from '../../grid/grid';
import { GridRange } from '../../grid/grid-range';
import { GridWithMargin } from '../../grid/grid-with-margin';
import { LicCalculator, SourceData } from '../../math/lic/lic-calculator';
import { BiasType, NoiseGenerator } from '../../math/noise-generator/noise-generator';
import { ChargeField } from '../../math/vector-field/charge-field';
import { Color, createGray, WHITE } from '../../utils/color';
import { Plane, PlaneConfig } from '../plane';

interface ChargesConfig extends PlaneConfig {
    gridRange: GridRange,
    licLength: number,
}

const INITIAL_GRID_RANGE: GridRange = { xMin: 0, xMax: 10, yCenter: 0 };

export class Charges extends Plane {

    constructor(grid: Grid) {
        super(grid);
        this.calculate();
    }

    override config: ModuleConfig<ChargesConfig> = new ModuleConfig(
        {
            gridRange: INITIAL_GRID_RANGE,
            licLength: 10,
        },
        'chargesConfig',
    );

    override refresh() {
        this.calculate();
    }

    private async calculate() {
        this.setProgress(0);
        const range = this.config.data.gridRange;
        this.grid.updateRange(range);

        const sourceGrid = new GridWithMargin(this.grid.resolution, range, 2 * this.config.data.licLength);
        const sourceField = new ChargeField(sourceGrid);

        // Create Source Image
        const generator = new NoiseGenerator(sourceGrid);
        const sourceData: SourceData = {
            grid: sourceGrid,
            image: generator.createBiasedNoise(BiasType.BOUNDS),
            field: sourceField.data,
        }
        this.updateImage(this.createSourceImage(sourceData));

        // LIC
        const calculator: LicCalculator = new LicCalculator(sourceData, this.grid);
        const calculation$ = calculator.calculate(this.config.data.licLength);
        calculation$.subscribe({
            next: (state) => { this.setProgress(state.progress) }
        });
        const result = await lastValueFrom(calculation$);
        if (result.data != null) {
            this.updateImage(this.createImage(result.data));
            this.setIdle();
        } else {
            console.error('#calculateAndDraw - calculation did not produce data')
        }
    }

    private createSourceImage(source: SourceData): ImageDataArray {
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

    private createImage(data: Float64Array): ImageDataArray {
        const imageData = new Uint8ClampedArray(this.grid.size * 4);
        for (let row = 0; row < this.grid.height; row++) {
            for (let col = 0; col < this.grid.width; col++) {
                const index = this.grid.getIndex(col, row);
                let value = data[index];
                this.drawPixel(imageData, index, (value == Number.MIN_SAFE_INTEGER) ? WHITE : createGray(value));
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