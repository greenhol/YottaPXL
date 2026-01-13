import { Grid } from '../../grid/grid';
import { RectangleCoordinates } from '../../stage/interactionOverlay';
import { BLACK, ColorMapper, WHITE } from '../../utils/color-mapper';
import { Plane } from '../plane';

export class MandelbrotSimple extends Plane {

    private _data: Float64Array;
    private _colorMapper: ColorMapper;

    private _maxIterations: number = 255;

    constructor(grid: Grid) {
        grid.updateRange({ xMin: -3, xMax: 1.8, yCenter: 0 });
        super(grid);

        this._colorMapper = new ColorMapper([
            { color: BLACK, cycleLength: 255 },
            { color: WHITE, cycleLength: 255 },
        ]);
        this.calculate();
    }

    override name: string = 'Mandelbrot Simple';

    override updateArea(selection: RectangleCoordinates) {
        const height = selection.y2 - selection.y1;
        const yCenter = selection.y1 + height / 2;
        this.grid.updateRange({ xMin: selection.x1, xMax: selection.x2, yCenter: yCenter });
        this.calculate();
    }

    override setMaxIterations(value: number) {
        this._maxIterations = value;
        this.calculate();
    }

    private calculate() {
        console.log(`#calculate - with max iterations ${this._maxIterations}`);
        this.setBusy();

        // ToDo: remove setTimeouts when web workers are 
        setTimeout(() => {
            this._data = new Float64Array(this.grid.size);

            for (let y = 0; y < this.grid.height; y++) {
                for (let x = 0; x < this.grid.width; x++) {
                    this._data[this.grid.getIndex(x, y)] = this.computeMandelbrot(x, y);
                }
            }

            this.updateImage(this.createImage());

            setTimeout(() => {
                this.setIdle();
            }, 0);
        }, 0);
    }

    private computeMandelbrot(x: number, y: number): number {
        const [reC, imC] = this.grid.pixelToMath(x, y);
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
        for (let y = 0; y < this.grid.height; y++) {
            for (let x = 0; x < this.grid.width; x++) {
                const index = this.grid.getIndex(x, y);
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