import { gridCopy } from '../../grid/grid';
import { GridWithMargin, gridWithMarginCopy } from '../../grid/grid-with-margin';
import { MessageFromWorker, MessageToWorker } from '../../worker/types';
import { VectorFieldReader } from './../vector-field/vector-field-reader';
import { PointInPixel, WorkerSetup } from './worker-setup';

self.onmessage = (e) => {
    const { type, data } = e.data;
    if (type === MessageToWorker.START) {
        const result = calculate(data);
        self.postMessage({ type: MessageFromWorker.RESULT, result }, [result.buffer]);
    }
};

function calculate(setup: WorkerSetup): Float64Array {
    const targetGrid = gridCopy(setup.targetGridBlueprint);
    const sourceGrid = gridWithMarginCopy(setup.sourceGridBlueprint);
    const image = setup.image;
    const field = new VectorFieldReader(sourceGrid, setup.field);

    let timeStamp = Date.now();
    const targetData = new Float64Array(targetGrid.size);
    let cnt = 0;
    for (let row = 0; row < targetGrid.height; row++) {
        for (let col = 0; col < targetGrid.width; col++) {
            let length = setup.maxLength;
            const magnitude = field.getMagnitude(col + sourceGrid.margin, row + sourceGrid.margin);
            if (setup.strength > 0) {
                length = Math.min(setup.maxLength, magnitude * setup.strength);
                length = Math.max(setup.minLength, length);
            }
            targetData[targetGrid.getIndex(col, row)] = (magnitude == 0) ?
                Number.MIN_SAFE_INTEGER :
                calcLicPixel(col, row, length, sourceGrid, image, field);
        }
        cnt += targetGrid.width;
        if (cnt > 25000) {
            const progress = Math.round(100 * (row * targetGrid.width) / targetGrid.size);
            self.postMessage({ type: MessageFromWorker.UPDATE, progress });
            cnt = 0;
        }
    }
    console.info('calculation done in ' + (Date.now() - timeStamp) / 1000 + 's');
    return targetData;
}

function calcLicPixel(
    col: number,
    row: number,
    length: number,
    sourceGrid: GridWithMargin,
    image: Float64Array,
    field: VectorFieldReader,
): number {
    let brightness = calcLicPixelInDirection(col, row, length, 1, sourceGrid, image, field);
    brightness += calcLicPixelInDirection(col, row, length, -1, sourceGrid, image, field);

    brightness = brightness / (2 * length);
    if (brightness > 1) brightness = 1;
    return brightness;
}

function calcLicPixelInDirection(
    col: number,
    row: number,
    length: number,
    direction: number,
    sourceGrid: GridWithMargin,
    image: Float64Array,
    field: VectorFieldReader,
): number {
    let restDistance = length;
    let [vX, vY] = field.getVector(col + sourceGrid.margin, row + sourceGrid.margin);
    if (vX == 0 && vY == 0) return Number.MIN_SAFE_INTEGER;
    vX *= direction;
    vY *= direction;
    let [vX0, vY0] = [vX, vY];
    let nextArea = getNextArea(0.5, 0.5, vX, vY);
    let factor = (nextArea.distance < restDistance) ? nextArea.distance : restDistance;
    let brightness = image[sourceGrid.getIndexForCenterArea(col, row)] * factor;
    restDistance = length - nextArea.distance;
    while (restDistance > 0) {
        row += nextArea.rowDiff;
        col += nextArea.colDiff;
        [vX, vY] = field.getVector(col + sourceGrid.margin, row + sourceGrid.margin);
        if (Number.isNaN(vX) || Number.isNaN(vY) || (vX == 0 && vY == 0)) {
            [vX, vY] = [vX0, vY0];
        } else {
            [vX0, vY0] = [vX, vY];
        }
        vX *= direction;
        vY *= direction;
        nextArea = getNextArea(nextArea.x, nextArea.y, vX, vY);
        factor = (nextArea.distance < restDistance) ? nextArea.distance : restDistance;
        brightness += (image[sourceGrid.getIndexForCenterArea(col, row)] * factor);
        restDistance -= nextArea.distance;
    }
    return brightness;
}

function getNextArea(x: number, y: number, vX: number, vY: number): PointInPixel {
    let alphas: number[] = []
    let beta: number;
    const offset = 0.01;
    // Top, Bottom, Left, Right
    alphas.push((1 - y) / vY);
    alphas.push(-y / vY);
    alphas.push(-x / vX);
    alphas.push((1 - x) / vX);
    alphas.forEach((alpha: number, i: number) => {
        if (alpha <= 0) alphas[i] = Infinity;
    })
    const borderIndex = alphas.indexOf(Math.min(...alphas));
    const distance = Math.sqrt(Math.pow(alphas[borderIndex] * vX, 2) + Math.pow(alphas[borderIndex] * vY, 2)) / Math.SQRT2;

    switch (borderIndex) {
        case 0: // Top
            beta = vX * alphas[borderIndex] + x;
            return {
                rowDiff: -1,
                colDiff: 0,
                x: beta,
                y: offset,
                distance: distance
            }
        case 1: // Bottom
            beta = vX * alphas[borderIndex] + x;
            return {
                rowDiff: 1,
                colDiff: 0,
                x: beta,
                y: 1 - offset,
                distance: distance
            }
        case 2: // Left
            beta = vY * alphas[borderIndex] + y;
            return {
                rowDiff: 0,
                colDiff: -1,
                x: 1 - offset,
                y: beta,
                distance: distance
            }
        case 3: // Right
            beta = vY * alphas[borderIndex] + y;
            return {
                rowDiff: 0,
                colDiff: 1,
                x: offset,
                y: beta,
                distance: distance
            }
        default:
            return {
                rowDiff: 0,
                colDiff: 0,
                x: 0.5,
                y: 0.5,
                distance: distance
            }
    }
}
