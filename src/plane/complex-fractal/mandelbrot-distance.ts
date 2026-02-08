import { ModuleConfig } from '../../config/module-config';
import { Grid } from '../../grid/grid';
import { GridRange } from '../../grid/grid-range';
import { MandelbrotCalculator } from '../../math/complex-fractal/mandelbrot-calculator';
import { BLACK, RED, WHITE } from '../../utils/color';
import { ColorMapper } from '../../utils/color-mapper';
import { Plane, PlaneConfig } from '../plane';

interface MandelbrotDistanceConfig extends PlaneConfig {
    gridRange: GridRange,
    maxIterations: number,
    escapeValue: number,
}

const INITIAL_GRID_RANGE: GridRange = { xMin: -3, xMax: 1.8, yCenter: 0 };

export class MandelbrotDistance extends Plane {

    constructor(grid: Grid) {
        super(grid);
        this.calculate();
    }

    override config: ModuleConfig<MandelbrotDistanceConfig> = new ModuleConfig(
        {
            gridRange: INITIAL_GRID_RANGE,
            maxIterations: 2000,
            escapeValue: 100,
        },
        'mandelbrotDistanceConfig',
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
        console.log(`#calculate - with max iterations ${this.config.data.maxIterations}`);
        this.grid.updateRange(this.config.data.gridRange);
        this.setBusy();

        // ToDo: remove setTimeouts when web workers are implemented
        setTimeout(() => {
            const calculator: MandelbrotCalculator = new MandelbrotCalculator(this.config.data.escapeValue);
            const data: Float64Array = calculator.calculateDistances(this.grid, this.config.data.maxIterations);
            this.updateImage(this.createImage(data));

            setTimeout(() => {
                this.setIdle();
            }, 0);
        }, 0);
    }

    private createImage(data: Float64Array): ImageDataArray {
        const imageData = new Uint8ClampedArray(this.grid.size * 4);
        const cycleLength = (this.grid.range.xMax - this.grid.range.xMin) / this.config.data.escapeValue / 50;
        const colorMapper = new ColorMapper([
            { color: BLACK, cycleLength: cycleLength },
            { color: WHITE, cycleLength: cycleLength },
        ], WHITE);

        for (let row = 0; row < this.grid.height; row++) {
            for (let col = 0; col < this.grid.width; col++) {
                const index = this.grid.getIndex(col, row);
                let value = data[index];
                if (value <= 0) {
                    value = -1;
                }
                const color = colorMapper.map(value);
                const pixelIndex = index * 4;
                imageData[pixelIndex] = color.r;     // R
                imageData[pixelIndex + 1] = color.g; // G
                imageData[pixelIndex + 2] = color.b; // B
                imageData[pixelIndex + 3] = 255; // A (opaque)
            }
        }
        return imageData;
    }
}