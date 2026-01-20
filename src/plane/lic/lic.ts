import { ModuleConfig } from '../../config/module-config';
import { Grid } from '../../grid/grid';
import { GridRange } from '../../grid/grid-range';
import { GridWithMargin } from '../../grid/grid-with-margin';
import { LicCalculator, SourceData } from '../../math/lic/lic-calculator';
import { BiasType, NoiseGenerator } from '../../math/noise-generator/noise-generator';
import { ChargeField } from '../../math/vector-field/charge-field';
import { Plane, PlaneConfig } from '../plane';

const INITIAL_GRID_RANGE: GridRange = { xMin: -1, xMax: 1, yCenter: 0 };
const LIC_LENGTH: number = 15;

export class Lic extends Plane {

    constructor(grid: Grid) {
        super(grid);
        this.calculate();
    }

    override config: ModuleConfig<PlaneConfig> = new ModuleConfig(
        { gridRange: INITIAL_GRID_RANGE },
        'licConfig',
    );

    override name: string = 'LIC';

    override updateGridRange(selectedRange: GridRange) {
        console.log('LIC #updateArea - not implemented yet');
        if (selectedRange != null) {
            this.config.data.gridRange = selectedRange;
        } else {
            this.config.reset();
        }
        this.calculate();
    }

    override setMaxIterations(value: number) {
        // Does not apply
    }

    private calculate() {
        this.setBusy();
        const range = this.config.data.gridRange;
        this.grid.updateRange(range);

        const sourceGrid = new GridWithMargin(this.grid.resolution, range, LIC_LENGTH);
        const sourceField = new ChargeField(sourceGrid);

        // ToDo: remove setTimeouts when web workers are 
        setTimeout(() => {
            const generator = new NoiseGenerator(sourceGrid);
            const sourceData: SourceData = {
                grid: sourceGrid,
                field: sourceField,
                data: generator.createBiasedNoise(BiasType.UPPER),
            }
            this.updateImage(this.createImage(sourceData.data));

            setTimeout(() => {
                const calculator: LicCalculator = new LicCalculator(sourceData, this.grid);
                const licData = calculator.calculate(LIC_LENGTH);
                this.updateImage(this.createImage(licData));

                setTimeout(() => {
                    this.setIdle();
                }, 50);
            }, 50);
        }, 50);
    }

    private createImage(data: Float64Array): ImageDataArray {
        const imageData = new Uint8ClampedArray(this.grid.size * 4);
        for (let row = 0; row < this.grid.height; row++) {
            for (let col = 0; col < this.grid.width; col++) {
                const index = this.grid.getIndex(col, row);
                let value = Math.round(data[index] * 255);
                const pixelIndex = index * 4;
                imageData[pixelIndex] = value;     // R
                imageData[pixelIndex + 1] = value; // G
                imageData[pixelIndex + 2] = value; // B
                imageData[pixelIndex + 3] = 255; // A (opaque)
            }
        }
        return imageData;
    }
}