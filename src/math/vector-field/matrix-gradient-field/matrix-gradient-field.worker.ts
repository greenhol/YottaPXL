import { GridWithMargin } from '../../../grid/grid-with-margin';
import { MessageFromWorker, MessageToWorker } from '../../../worker/types';
import { ImageGradientKernel, SOBEL_KERNEL_6 } from '../../image-gradient-kernel/image-gradient-kernel';
import { WorkerSetupMatrixGradientField } from './worker-setup-matrix-gradient-field';

self.onmessage = (e) => {
    let timeStamp = Date.now();
    const { type, data } = e.data;
    if (type === MessageToWorker.START) {
        const result = calculate(data);
        console.info(`#MatrixGradientField (worker) - calculation done in ${(Date.now() - timeStamp) / 1000}s`);
        self.postMessage({ type: MessageFromWorker.RESULT, result }, [result.buffer]);
    }
};

function calculate(setup: WorkerSetupMatrixGradientField): Float64Array {
    const grid = GridWithMargin.copyWithMargin(setup.gridBlueprint);
    const data = setup.data;
    let cnt = 0;

    for (let row = 0; row < grid.height; row++) {
        for (let col = 0; col < grid.width; col++) {
            const [x, y] = grid.pixelToMath(col, row);
            const [vX, vY, magnitude] = computeVector(setup.input, grid, setup.min, setup.max, x, y);
            const index = grid.getIndex(col, row) * 3;
            data[index] = vX;
            data[index + 1] = vY;
            data[index + 2] = magnitude;
        }
        cnt += grid.width;
        if (cnt > 50000) {
            const progress = Math.round(100 * (row * grid.width) / grid.size);
            self.postMessage({ type: MessageFromWorker.UPDATE, progress });
            cnt = 0;
        }
    }
    return data;
}

function computeVector(input: Float64Array, grid: GridWithMargin, min: number, max: number, x: number, y: number): [number, number, number] {
    let vX = 0;
    let vY = 0;

    const [col, row] = grid.mathToPixel(x, y);
    const value = input[grid.getIndex(col, row)];
    if (value < min || value > max) return [0, 0, 0];

    [vX, vY] = pixelGradient(input, grid, col, row, SOBEL_KERNEL_6);

    const magnitude = Math.sqrt(vX * vX + vY * vY);
    return [
        vX / magnitude,
        vY / magnitude,
        magnitude,
    ];
}

function pixelGradient(input: Float64Array, grid: GridWithMargin, col: number, row: number, kernel: ImageGradientKernel): [number, number] {
    let pixelX = 0;
    let pixelY = 0;

    for (let ky = -kernel.order; ky <= kernel.order; ky++) {
        for (let kx = -kernel.order; kx <= kernel.order; kx++) {
            const pixel = input[grid.getIndex(col + ky, row + kx)];
            const weightX = kernel.x[ky + kernel.order][kx + kernel.order];
            const weightY = kernel.y[ky + kernel.order][kx + kernel.order];
            pixelX += pixel * weightX;
            pixelY += pixel * weightY;
        }
    }

    return [pixelX, pixelY];
}