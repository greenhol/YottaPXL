import { Grid } from '../../grid/grid';

export class VectorFieldReader {

    private _grid: Grid;
    private _data: Float64Array;
    private _reader: (col: number, row: number) => [number, number];

    constructor(grid: Grid, data: Float64Array, orthogonal: boolean = false) {
        if (data.length !== grid.size * 3) {
            throw Error(`grid (size=${grid.size}) and data (data.length=${data.length}) do not match. (data.length !== grid.size * 3)`);
        }
        this._grid = grid;
        this._data = data;
        this._reader = orthogonal ? this.forwardVectorOrthogonal : this.forwardVector;
    }

    public getVector(col: number, row: number): [number, number] {
        return this._reader(col, row);
    }

    public getMagnitude(col: number, row: number): number {
        return this._data[3 * this._grid.getIndex(col, row) + 2];
    }

    private forwardVector(col: number, row: number): [number, number] {
        const index = this._grid.getIndex(col, row) * 3;
        return [
            this._data[index],     // vX
            this._data[index + 1], // vY
        ];
    }

    private forwardVectorOrthogonal(col: number, row: number): [number, number] {
        const index = this._grid.getIndex(col, row) * 3;
        return [
            this._data[index + 1], // vY
            -this._data[index],    // -vX
        ];
    }
}