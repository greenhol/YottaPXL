import { GridWithMargin } from '../../grid/grid-with-margin';

export interface SourceData {
    grid: GridWithMargin,
    field: VectorField,
    data: Float64Array,
}

export abstract class VectorField {

    private _grid: GridWithMargin;
    private _vX: Float64Array;
    private _vY: Float64Array;
    private _magnitude: Float64Array;

    constructor(grid: GridWithMargin) {
        this._grid = grid;
    }

    public abstract computeVector(x: number, y: number): [number, number, number];

    public get grid(): GridWithMargin {
        return this._grid;
    }

    public getVector(col: number, row: number): [number, number] {
        return [
            this._vX[this._grid.getIndex(col, row)],
            this._vY[this._grid.getIndex(col, row)],
        ];
    }

    public getMagnitude(col: number, row: number): number {
        return this._magnitude[this._grid.getIndex(col, row)];
    }

    public precomputeVectors() {
        this._vX = new Float64Array(this._grid.size);
        this._vY = new Float64Array(this._grid.size);
        this._magnitude = new Float64Array(this._grid.size);

        for (let row = 0; row < this._grid.height; row++) {
            for (let col = 0; col < this._grid.width; col++) {
                const [x, y] = this._grid.pixelToMath(col, row);
                const [vX, vY, magnitude] = this.computeVector(x, y);
                this._vX[this._grid.getIndex(col, row)] = vX;
                this._vY[this._grid.getIndex(col, row)] = vY;
                this._magnitude[this._grid.getIndex(col, row)] = magnitude;
            }
        }
    }
}