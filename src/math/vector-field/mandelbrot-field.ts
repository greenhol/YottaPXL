import { GridWithMargin } from '../../grid/grid-with-margin';
import { ImageGradientKernel, SOBEL_KERNEL_6 } from '../image-gradient-kernel/image-gradient-kernel';
import { MandelbrotCalculator } from './../complex-fractal/mandelbrot-calculator';
import { VectorField } from './vector-field';

interface Charge {
    x: number;
    y: number;
    magnitude: number;
}

export class MandelbrotField extends VectorField {

    private _mandelbrotData: Float64Array;
    private _maxIterations: number = 2000;

    constructor(grid: GridWithMargin) {
        super(grid);
        this.init();
        this.precomputeVectors();
    }

    override computeVector(x: number, y: number): [number, number, number] {
        let vX = 0;
        let vY = 0;

        const [col, row] = this.grid.mathToPixel(x, y);
        const iterations = this._mandelbrotData[this.grid.getIndex(col, row)];
        if (iterations == this._maxIterations) return [0, 0, 0];

        [vX, vY] = this.imageGradient(col, row, SOBEL_KERNEL_6);

        // Rotate
        // const temp = vX;
        // vX = -vY;
        // vY = temp;

        const magnitude = Math.sqrt(vX * vX + vY * vY);
        return [
            vX / magnitude,
            vY / magnitude,
            magnitude,
        ];
    }

    private imageGradient(col: number, row: number, kernel: ImageGradientKernel): [number, number] {
        let pixelX = 0;
        let pixelY = 0;

        for (let ky = -kernel.order; ky <= kernel.order; ky++) {
            for (let kx = -kernel.order; kx <= kernel.order; kx++) {
                const pixel = this._mandelbrotData[this.grid.getIndex(col + ky, row + kx)];
                const weightX = kernel.x[ky + kernel.order][kx + kernel.order];
                const weightY = kernel.y[ky + kernel.order][kx + kernel.order];
                pixelX += pixel * weightX;
                pixelY += pixel * weightY;
            }
        }

        return [pixelX, pixelY];
    }

    private scharrOperatorForPixel3(col: number, row: number): [number, number] {
        const kernelX = [[-3, 0, 3], [-10, 0, 10], [-3, 0, 3]];
        const kernelY = [[-3, -10, -3], [0, 0, 0], [3, 10, 3]];

        let pixelX = 0;
        let pixelY = 0;

        for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
                const pixel = this._mandelbrotData[this.grid.getIndex(col + kx, row + ky)];
                const weightX = kernelX[ky + 1][kx + 1];
                const weightY = kernelY[ky + 1][kx + 1];
                pixelX += pixel * weightX;
                pixelY += pixel * weightY;
            }
        }

        return [pixelX, pixelY];
    }

    private init() {
        const mandelbrotCalculator = new MandelbrotCalculator(100);
        this._mandelbrotData = mandelbrotCalculator.calculate(this.grid, this._maxIterations);
    }
}