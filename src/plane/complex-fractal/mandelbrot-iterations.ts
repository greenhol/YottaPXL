import { ModuleConfig } from '../../config/module-config';
import { Grid } from '../../grid/grid';
import { GridRange, rangeXdiff } from '../../grid/grid-range';
import { MandelbrotCalculator } from '../../math/complex-fractal/mandelbrot-calculator';
import { BLACK, WHITE } from '../../utils/color';
import { ColorMapper } from '../../utils/color-mapper';
import { Plane, PlaneConfig } from '../plane';
import { estimateMaxIterations } from './estimate-max-iterations';

interface MandelbrotIterationsConfig extends PlaneConfig {
    gridRange: GridRange,
    maxIterations: number,
    escapeValue: number,
}

const INITIAL_GRID_RANGE: GridRange = { xMin: -3, xMax: 1.8, yCenter: 0 };

export class MandelbrotIterations extends Plane {

    private _effectiveMaxIterations = 255;

    constructor(grid: Grid) {
        super(grid);
        this.grid.updateRange(this.config.data.gridRange);
        this.calculate();
    }

    override config: ModuleConfig<MandelbrotIterationsConfig> = new ModuleConfig(
        {
            gridRange: INITIAL_GRID_RANGE,
            maxIterations: 0,
            escapeValue: 2,
        },
        'mandelbrotIterationsConfig',
    );

    override updateGridRange(selectedRange: GridRange | null) {
        console.log(`#calculate - with max iterations ${this._effectiveMaxIterations}`);
        if (selectedRange != null) {
            this.config.data.gridRange = selectedRange;
        } else {
            this.config.reset();
        }
        this.grid.updateRange(this.config.data.gridRange);
        this.calculate();
    }

    private calculate() {
        this._effectiveMaxIterations = estimateMaxIterations(this.config.data.maxIterations, rangeXdiff(INITIAL_GRID_RANGE), this.grid.xDiff);
        console.log(`#calculate - with max iterations ${this._effectiveMaxIterations}`);

        this.setBusy();

        // ToDo: remove setTimeouts when web workers are implemented
        setTimeout(() => {
            const calculator: MandelbrotCalculator = new MandelbrotCalculator(this.config.data.escapeValue);
            const data: Float64Array = calculator.calculateIterations(this.grid, this._effectiveMaxIterations);
            this.updateImage(this.createImage(data));

            setTimeout(() => {
                this.setIdle();
            }, 0);
        }, 0);
    }

    private createImage(data: Float64Array): ImageDataArray {
        const imageData = new Uint8ClampedArray(this.grid.size * 4);
        const colorMapper = new ColorMapper([
            { color: BLACK, cycleLength: 255 },
            { color: WHITE, cycleLength: 255 },
        ]);

        for (let row = 0; row < this.grid.height; row++) {
            for (let col = 0; col < this.grid.width; col++) {
                const index = this.grid.getIndex(col, row);
                let value = data[index];
                if (value === this._effectiveMaxIterations) {
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