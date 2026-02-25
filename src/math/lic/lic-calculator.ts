import { Grid } from '../../grid/grid';
import { GridWithMargin } from '../../grid/grid-with-margin';
import { VectorFieldReader } from '../vector-field/vector-field-reader';

export interface SourceData {
    grid: GridWithMargin,
    image: Float64Array,
    field: Float64Array,
}

interface PointInPixel {
    rowDiff: number;
    colDiff: number;
    x: number;
    y: number;
    distance: number;
}

export class LicCalculator {

    private _image: Float64Array;
    private _field: VectorFieldReader;
    private _sourceGrid: GridWithMargin;
    private _targetGrid: Grid;

    constructor(sourceData: SourceData, targetGrid: Grid) {
        this._image = sourceData.image;
        this._field = new VectorFieldReader(sourceData.grid, sourceData.field);
        this._sourceGrid = sourceData.grid;
        this._targetGrid = targetGrid;
    }

    public calculate(maxLength: number, minLength: number = 0, strength: number = -1): Float64Array {
        const targetData = new Float64Array(this._targetGrid.size);
        this.calcLicByLength(targetData, maxLength, minLength, strength);
        return targetData;
    }

    private calcLicByLength(targetData: Float64Array, maxLength: number, minLength: number, strength: number) {
        let rowCnt = 0;
        let timeStamp = Date.now();

        for (let row = 0; row < this._targetGrid.height; row++) {
            for (let col = 0; col < this._targetGrid.width; col++) {
                let length = maxLength;
                const magnitude = this._field.getMagnitude(col + this._sourceGrid.margin, row + this._sourceGrid.margin);
                if (strength > 0) {
                    length = Math.min(maxLength, magnitude * strength);
                    length = Math.max(minLength, length);
                }
                targetData[this._targetGrid.getIndex(col, row)] = (magnitude == 0) ?
                    Number.MIN_SAFE_INTEGER :
                    this.calcLicPixel(col, row, length);
            }
            if (rowCnt > 49) {
                console.info('calculating: ' + Math.round(100 * row / this._targetGrid.height) + '%');
                rowCnt = 0;
            }
            rowCnt++;
        }
        console.info('calculation done in ' + (Date.now() - timeStamp) / 1000 + 's');
    }

    private calcLicPixel(col: number, row: number, length: number): number {
        let brightness = this.calcLicPixelInDirection(col, row, length);
        brightness += this.calcLicPixelInDirection(col, row, length, -1);

        brightness = brightness / (2 * length);
        if (brightness > 1) brightness = 1;
        return brightness;
    }

    private calcLicPixelInDirection(col: number, row: number, length: number, direction: number = 1): number {
        let restDistance = length;
        let [vX, vY] = this._field.getVector(col + this._sourceGrid.margin, row + this._sourceGrid.margin);
        if (vX == 0 && vY == 0) return Number.MIN_SAFE_INTEGER;
        vX *= direction;
        vY *= direction;
        let [vX0, vY0] = [vX, vY];
        let nextArea = this.getNextArea(0.5, 0.5, vX, vY);
        let factor = (nextArea.distance < restDistance) ? nextArea.distance : restDistance;
        let brightness = this._image[this._sourceGrid.getIndexForCenterArea(col, row)] * factor;
        restDistance = length - nextArea.distance;
        while (restDistance > 0) {
            row += nextArea.rowDiff;
            col += nextArea.colDiff;
            [vX, vY] = this._field.getVector(col + this._sourceGrid.margin, row + this._sourceGrid.margin);
            if (Number.isNaN(vX) || Number.isNaN(vY) || (vX == 0 && vY == 0)) {
                [vX, vY] = [vX0, vY0];
            } else {
                [vX0, vY0] = [vX, vY];
            }
            vX *= direction;
            vY *= direction;
            nextArea = this.getNextArea(nextArea.x, nextArea.y, vX, vY);
            factor = (nextArea.distance < restDistance) ? nextArea.distance : restDistance;
            brightness += (this._image[this._sourceGrid.getIndexForCenterArea(col, row)] * factor);
            restDistance -= nextArea.distance;
        }
        return brightness;
    }

    private getNextArea(x: number, y: number, vX: number, vY: number): PointInPixel {
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
}