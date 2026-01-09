import { Grid } from '../grid/grid';
import { RectangleCoordinates } from '../stage/interactionOverlay';
import { BLACK, ColorMapper, WHITE } from '../utils/color-mapper';
import { Plane } from './plane';

// const CYCLE_LENGTH = 255; // Configurable cycle length
// const BLACK: RGB = { r: 0, g: 0, b: 0 };

export class MandelbrotSimple extends Plane {

    private _data: Float64Array;
    private _colorMapper: ColorMapper;

    private _maxIterations: number = 255;

    constructor(grid: Grid) {
        grid.setRange(-3, 1.8);
        super(grid);

        this._colorMapper = new ColorMapper([
            { color: BLACK, cycleLength: 255 },
            { color: WHITE, cycleLength: 255 },
        ]);
        this.calculate();
    }

    override name: string = 'Mandelbrot Simple';

    public updateArea(selection: RectangleCoordinates) {
        const height = selection.y2 - selection.y1;
        const yCenter = selection.y1 + height / 2;
        this.grid.setRange(selection.x1, selection.x2, yCenter);
        this.calculate();
    }

    public set maxIterations(value: number) {
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
                    this._data[this.grid.get(x, y)] = this.computeMandelbrot(x, y);
                }
            }

            this.updateImage(this.produceImage());

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

    private produceImage(): ImageDataArray {
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