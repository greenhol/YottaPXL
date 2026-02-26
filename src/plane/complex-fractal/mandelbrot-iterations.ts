import { lastValueFrom } from 'rxjs';
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

    override refresh() {
        this.calculate();
    }

    private async calculate() {
        this._effectiveMaxIterations = estimateMaxIterations(this.config.data.maxIterations, rangeXdiff(INITIAL_GRID_RANGE), this.grid.xDiff);
        console.log(`#calculate - with max iterations ${this._effectiveMaxIterations}`);

        this.setProgress(0);
        const calculation$ = new MandelbrotCalculator().calculateIterations(this.grid, this._effectiveMaxIterations);
        calculation$.subscribe({
            next: (state) => { this.setProgress(state.progress) }
        });
        const result = await lastValueFrom(calculation$);
        if (result.data != null) {
            this.updateImage(this.createImage(result.data));
            this.setIdle();
        } else {
            console.error('#calculate - calculation did not produce data')
        }
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