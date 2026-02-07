import { GridWithMargin } from '../../grid/grid-with-margin';
import { ImageGradientKernel, SOBEL_KERNEL_6 } from '../image-gradient-kernel/image-gradient-kernel';
import { MandelbrotCalculator } from './../complex-fractal/mandelbrot-calculator';
import { VectorField } from './vector-field';

export class MandelbrotField extends VectorField {

    private _mandelbrotData: Float64Array;
    private _maxIterations: number;

    constructor(grid: GridWithMargin, maxIterations: number, escapeValue: number) {
        super(grid);
        this._maxIterations = maxIterations;

        const mandelbrotCalculator = new MandelbrotCalculator(escapeValue);
        this._mandelbrotData = mandelbrotCalculator.calculateDistances(this.grid, this._maxIterations);
        
        this.precomputeVectors();
    }

    override computeVector(x: number, y: number): [number, number, number] {
        let vX = 0;
        let vY = 0;

        const [col, row] = this.grid.mathToPixel(x, y);
        const iterations = this._mandelbrotData[this.grid.getIndex(col, row)];
        if (iterations == this._maxIterations) return [0, 0, 0];

        [vX, vY] = this.pixelGradient(col, row, SOBEL_KERNEL_6);

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

    private pixelGradient(col: number, row: number, kernel: ImageGradientKernel): [number, number] {
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
}