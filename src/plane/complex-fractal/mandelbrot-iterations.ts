import { lastValueFrom } from 'rxjs';
import { InitializeAfterConstruct } from '../../../shared';
import { ModuleConfig, UiFieldInteger } from '../../../shared/config';
import { GridRange, rangeXdiff } from '../../grid/grid-range';
import { ColorMapper } from '../../math/color-mapper/color-mapper';
import { MandelbrotCalculator } from '../../math/complex-fractal/mandelbrot-calculator';
import { COLORS } from '../../types';
import { Plane, PlaneConfig } from '../plane';
import { COLOR } from './../../types/color';
import { estimateMaxIterations } from './estimate-max-iterations';

interface MandelbrotIterationsConfig extends PlaneConfig {
    maxIterations: number,
}

const INITIAL_GRID_RANGE: GridRange = { xMin: -3, xMax: 1.8, yCenter: 0 };

@InitializeAfterConstruct()
export class MandelbrotIterations extends Plane {

    private _effectiveMaxIterations = 255;

    override config: ModuleConfig<MandelbrotIterationsConfig> = new ModuleConfig(
        {
            gridRange: INITIAL_GRID_RANGE,
            maxIterations: 0,
        },
        'mandelbrotIterationsConfig',
        [
            new UiFieldInteger('maxIterations', 'Max Iterations', 'Maximum iterations (0: automatic estimation)', 0, 100000),
        ],
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
        const colorMapper = ColorMapper.fromColors(COLORS.BW);
        this.config.setInfo('Gradient', colorMapper.supportPointsString);

        for (let row = 0; row < this.grid.height; row++) {
            for (let col = 0; col < this.grid.width; col++) {
                const index = this.grid.getIndex(col, row);
                let value = data[index];
                const color = (value === this._effectiveMaxIterations) ? COLOR.BLACK : colorMapper.map(value, 255);
                const pixelIndex = index * 4;
                imageData[pixelIndex] = color.r;
                imageData[pixelIndex + 1] = color.g;
                imageData[pixelIndex + 2] = color.b;
                imageData[pixelIndex + 3] = 255; // A (opaque)
            }
        }
        return imageData;
    }
}