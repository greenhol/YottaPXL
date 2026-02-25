import { Grid } from '../../grid/grid';

export class VectorFieldReader {

    private _grid: Grid;
    private _data: Float64Array;

    constructor(grid: Grid, data: Float64Array) {
        if (data.length !== grid.size * 3) {
            throw Error(`grid (size=${grid.size}) and data (data.length=${data.length}) do not match. (data.length !== grid.size * 3)`);
        }
        this._grid = grid;
        this._data = data;
    }

    public getVector(col: number, row: number): [number, number] {
        const index = this._grid.getIndex(col, row) * 3;
        return [
            this._data[index],     // vX
            this._data[index + 1], // vY
        ];
    }

    public getMagnitude(col: number, row: number): number {
        return this._data[3 * this._grid.getIndex(col, row) + 2];
    }
}