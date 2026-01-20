import { ModuleConfig } from '../../config/module-config';
import { Grid } from '../../grid/grid';
import { GridRange } from '../../grid/grid-range';
import { BLACK, ColorMapper, WHITE } from '../../utils/color-mapper';
import { Plane, PlaneConfig } from '../plane';

const INITIAL_GRID_RANGE: GridRange = { xMin: -3, xMax: 1.8, yCenter: 0 };

export class MandelbrotSimple extends Plane {

    private _data: Float64Array;
    private _colorMapper: ColorMapper;

    private _maxIterations: number = 255;

    constructor(grid: Grid) {
        super(grid);

        this._colorMapper = new ColorMapper([
            { color: BLACK, cycleLength: 255 },
            { color: WHITE, cycleLength: 255 },
        ]);
        this.calculate();
    }

    override config: ModuleConfig<PlaneConfig> = new ModuleConfig(
        { gridRange: INITIAL_GRID_RANGE },
        'mandelBrotConfig',
    );

    override name: string = 'Mandelbrot Simple';

    override updateGridRange(selectedRange: GridRange | null) {
        console.log('MANDETBROT #updateArea');
        if (selectedRange != null) {
            this.config.data.gridRange = selectedRange;
        } else {
            this.config.reset();
        }
        this.calculate();
    }

    override setMaxIterations(value: number) {
        this._maxIterations = value;
        this.calculate();
    }

    private calculate() {
        console.log(`#calculate - with max iterations ${this._maxIterations}`);
        this.grid.updateRange(this.config.data.gridRange);
        this.setBusy();

        // ToDo: remove setTimeouts when web workers are 
        setTimeout(() => {
            this._data = new Float64Array(this.grid.size);

            for (let row = 0; row < this.grid.height; row++) {
                for (let col = 0; col < this.grid.width; col++) {
                    this._data[this.grid.getIndex(col, row)] = this.computeMandelbrot(col, row);
                }
            }

            this.updateImage(this.createImage());

            setTimeout(() => {
                this.setIdle();
            }, 0);
        }, 0);
    }

    private computeMandelbrot(col: number, row: number): number {
        const [reC, imC] = this.grid.pixelToMath(col, row);
        let reZ = 0;
        let imZ = 0;
        let iteration = 0;
        while (reZ * reZ + imZ * imZ < 4 && iteration < this._maxIterations) {
            const xTemp = reZ * reZ - imZ * imZ + reC;
            imZ = 2 * reZ * imZ + imC;
            reZ = xTemp;
            iteration++;
        }
        return iteration;
    }

    private createImage(): ImageDataArray {
        const imageData = new Uint8ClampedArray(this.grid.size * 4);
        for (let row = 0; row < this.grid.height; row++) {
            for (let col = 0; col < this.grid.width; col++) {
                const index = this.grid.getIndex(col, row);
                let value = this._data[index];
                if (value === this._maxIterations) {
                    value = -1;
                }
                const color = this._colorMapper.map(value);
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