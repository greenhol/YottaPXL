import { ModuleConfig } from '../../config/module-config';
import { Grid } from '../../grid/grid';
import { GridRange, rangeXdiff } from '../../grid/grid-range';
import { CalculationType, MandelbrotCalculator } from '../../math/complex-fractal/mandelbrot-calculator';
import { BLACK, WHITE } from '../../utils/color';
import { ColorMapper } from '../../utils/color-mapper';
import { Plane, PlaneConfig } from '../plane';
import { estimateMaxIterations } from './estimate-max-iterations';

interface MandelbrotDistanceConfig extends PlaneConfig {
    gridRange: GridRange,
    maxIterations: number,
    escapeValue: number,
}

const INITIAL_GRID_RANGE: GridRange = { xMin: -3, xMax: 1.8, yCenter: 0 };

export class MandelbrotDistance extends Plane {

    private _effectiveMaxIterations = 255;

    constructor(grid: Grid) {
        super(grid);
        this.grid.updateRange(this.config.data.gridRange);
        this.calculate();
    }

    override config: ModuleConfig<MandelbrotDistanceConfig> = new ModuleConfig(
        {
            gridRange: INITIAL_GRID_RANGE,
            maxIterations: 0,
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
        this.grid.updateRange(this.config.data.gridRange);
        this.calculate();
    }

    private calculate() {
        this._effectiveMaxIterations = estimateMaxIterations(this.config.data.maxIterations, rangeXdiff(INITIAL_GRID_RANGE), this.grid.xDiff);
        console.log(`#calculate - with max iterations ${this._effectiveMaxIterations}`);

        this.setProgress(0);
        const calculator: MandelbrotCalculator = new MandelbrotCalculator(this.config.data.escapeValue);
        calculator.calculateWithWorker(this.grid, this._effectiveMaxIterations, CalculationType.DISTANCE);
        calculator.calculationState$.subscribe({
            next: (state) => {
                this.setProgress(state.progress);
                if (state.data != null) {
                    this.updateImage(this.createImage(state.data));
                    this.setIdle();
                }
            }
        });
    }

    private createImage(data: Float64Array): ImageDataArray {
        const imageData = new Uint8ClampedArray(this.grid.size * 4);
        const cycleLength = this.grid.xDiff / this.config.data.escapeValue / 50;
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