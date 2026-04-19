import { GridWithMargin } from './../../grid/grid-with-margin';

export class VectorFieldReader {

    private _grid: GridWithMargin;
    private _data: Float64Array;
    private _reader: (col: number, row: number) => [number, number];

    constructor(grid: GridWithMargin, data: Float64Array, orthogonal: boolean = false) {
        if (data.length !== grid.size * 3) {
            throw Error(`grid (size=${grid.size}) and data (data.length=${data.length}) do not match. (data.length !== grid.size * 3)`);
        }
        this._grid = grid;
        this._data = data;
        this._reader = orthogonal ? this.forwardVectorOrthogonal : this.forwardVector;
    }

    public getVector(col: number, row: number): [number, number] {
        return this._reader(col + this._grid.margin, row + this._grid.margin);
    }

    public getMagnitude(col: number, row: number): number {
        return this._data[3 * this._grid.getIndex(col + this._grid.margin, row + this._grid.margin) + 2];
    }

    public evaluateMinMagnitude(): number {
        let min = Number.MAX_VALUE;
        this._data.filter((_, index) => index % 3 === 2).forEach(value => { if (!isNaN(value) && value < min) min = value; });
        return min;
    }

    public evaluateMaxMagnitude(): number {
        let max = Number.MIN_VALUE;
        this._data.filter((_, index) => index % 3 === 2).forEach(value => { if (!isNaN(value) && value > max) max = value; });
        return max;
    }

    public evaluateMeanMagnitude(): number {
        const length = this._data.length / 3;
        let mean = Number.MIN_VALUE;
        this._data.filter((_, index) => index % 3 === 2).forEach(value => { if (!isNaN(value)) mean += (value / length); });
        return mean;
    }

    public evaluateMedianMagnitude(): number {
        const magnitudes = this._data.filter((_, index) => index % 3 === 2).sort((a, b) => a - b);
        const mid = Math.floor(magnitudes.length / 2);
        return magnitudes.length % 2 === 0
            ? (magnitudes[mid - 1] + magnitudes[mid]) / 2
            : magnitudes[mid];
    }

    private forwardVector(colWithMargin: number, rowWithMargin: number): [number, number] {
        const index = this._grid.getIndex(colWithMargin, rowWithMargin) * 3;
        return [
            this._data[index],     // vX
            this._data[index + 1], // vY
        ];
    }

    private forwardVectorOrthogonal(colWithMargin: number, rowWithMargin: number): [number, number] {
        const index = this._grid.getIndex(colWithMargin, rowWithMargin) * 3;
        return [
            this._data[index + 1], // vY
            -this._data[index],    // -vX
        ];
    }
}