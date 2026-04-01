import { lastValueFrom } from 'rxjs';
import { InitializeAfterConstruct } from '../../../shared';
import { ModuleConfig, UiFieldFloat, UiFieldInteger } from '../../../shared/config';
import { GridRange, rangeXdiff } from '../../grid/grid-range';
import { ColorMapper } from '../../math/color-mapper/color-mapper';
import { MandelbrotCalculator } from '../../math/complex-fractal/mandelbrot-calculator';
import { COLOR, COLORS } from '../../types';
import { Plane, PlaneConfig } from '../plane';
import { estimateMaxIterations } from './estimate-max-iterations';

interface MandelbrotDistanceConfig extends PlaneConfig {
    maxIterations: number,
    escapeValue: number,
}

const INITIAL_GRID_RANGE: GridRange = { xMin: -3, xMax: 1.8, yCenter: 0 };

@InitializeAfterConstruct()
export class MandelbrotDistance extends Plane {

    private _effectiveMaxIterations = 255;

    override config: ModuleConfig<MandelbrotDistanceConfig> = new ModuleConfig(
        {
            gridRange: INITIAL_GRID_RANGE,
            maxIterations: 0,
            escapeValue: 100,
        },
        'mandelbrotDistanceConfig',
        [
            new UiFieldInteger('maxIterations', 'Max Iterations', 'Maximum iterations (0: automatic estimation)', 0, 100000),
            new UiFieldFloat('escapeValue', 'Escape value', 'Escape value', 2, 1000),
        ],
    );

    override init(): void {
        this.grid.updateRange(this.config.data.gridRange);
        this.refresh();
    }

    override refresh() {
        this.calculate();
    }

    private async calculate() {
        const calculator = new MandelbrotCalculator();
        this._effectiveMaxIterations = estimateMaxIterations(this.config.data.maxIterations, rangeXdiff(INITIAL_GRID_RANGE), this.grid.xDiff);
        console.log(`#calculate - with max iterations ${this._effectiveMaxIterations}`);

        this.setProgress(0);
        const calculation$ = calculator.calculateDistances(this.grid, this._effectiveMaxIterations, this.config.data.escapeValue);
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
        let max = 0;
        data.forEach(value => { if (value > max) max = value });
        const imageData = new Uint8ClampedArray(this.grid.size * 4);
        const colorMapper = ColorMapper.fromColors(COLORS.WB);
        const gradientScale = max / 12.5;

        for (let row = 0; row < this.grid.height; row++) {
            for (let col = 0; col < this.grid.width; col++) {
                const index = this.grid.getIndex(col, row);
                let value = data[index];
                if (value <= 0) {
                    value = -1;
                }
                const color = (value <= 0) ? COLOR.BLACK : colorMapper.map(value, gradientScale);
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