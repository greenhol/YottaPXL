import { Grid } from '../../grid/grid';
import { GridWithMargin } from '../../grid/grid-with-margin';

export interface SourceData {
    grid: GridWithMargin,
    field: VectorField,
    data: Float64Array,
}

export enum ScaleFactor {
    UNSCALED = 0,
    FACTOR_2 = 2,
    FACTOR_4 = 4,
    FACTOR_6 = 6,
    FACTOR_8 = 8,
    FACTOR_10 = 10,
    FACTOR_12 = 12,
    FACTOR_14 = 14,
    FACTOR_16 = 16,
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

    public precomputeVectors(scaleFactor: ScaleFactor = ScaleFactor.UNSCALED) {
        this._vX = new Float64Array(this._grid.size);
        this._vY = new Float64Array(this._grid.size);
        this._magnitude = new Float64Array(this._grid.size);

        switch (scaleFactor) {
            case ScaleFactor.UNSCALED: this.precomputeUnscaledVectors(); break;
            case ScaleFactor.FACTOR_2:
            case ScaleFactor.FACTOR_4:
            case ScaleFactor.FACTOR_6:
            case ScaleFactor.FACTOR_8:
            case ScaleFactor.FACTOR_10:
            case ScaleFactor.FACTOR_12:
            case ScaleFactor.FACTOR_14:
            case ScaleFactor.FACTOR_16: this.precomputeScaledVectors(scaleFactor); break;
        }
    }

    private precomputeUnscaledVectors() {
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

    private precomputeScaledVectors(factor: number) {
        const lowResGrid = new Grid({
            width: Math.ceil(this.grid.width / factor),
            height: Math.ceil(this.grid.height / factor),
            description: `${this.grid.resolution.description} scaled by factor ${factor}}`,
        });
        lowResGrid.updateRange(this.grid.range);
        const lowResvX = new Float64Array(lowResGrid.size);
        const lowResvY = new Float64Array(lowResGrid.size);
        const lowResMagnitude = new Float64Array(lowResGrid.size);

        for (let row = 0; row < lowResGrid.height; row++) {
            for (let col = 0; col < lowResGrid.width; col++) {
                const [x, y] = lowResGrid.pixelToMath(col, row);
                const [vX, vY, magnitude] = this.computeVector(x, y);
                lowResvX[lowResGrid.getIndex(col, row)] = vX;
                lowResvY[lowResGrid.getIndex(col, row)] = vY;
                lowResMagnitude[lowResGrid.getIndex(col, row)] = magnitude;
            }
        }
        this.scaleVectorField(lowResGrid, lowResvX, lowResvY);
    }

    private scaleVectorField(
        lowResGrid: Grid,
        lowResvX: Float64Array,
        lowResvY: Float64Array,
    ) {
        const colScale = (lowResGrid.width - 1) / (this.grid.width - 1);
        const rowScale = (lowResGrid.height - 1) / (this.grid.height - 1);

        for (let row = 0; row < this.grid.height; row++) {
            const rowLowRes = row * rowScale;
            const row0 = Math.floor(rowLowRes);
            const row1 = Math.min(row0 + 1, lowResGrid.height - 1);
            const rowFrac = rowLowRes - row0;

            for (let col = 0; col < this.grid.width; col++) {
                const colLowRes = col * colScale;
                const col0 = Math.floor(colLowRes);
                const col1 = Math.min(col0 + 1, lowResGrid.width - 1);
                const colFrac = colLowRes - col0;

                const q00 = [lowResvX[lowResGrid.getIndex(col0, row0)], lowResvY[lowResGrid.getIndex(col0, row0)]];
                const q01 = [lowResvX[lowResGrid.getIndex(col0, row1)], lowResvY[lowResGrid.getIndex(col0, row1)]];
                const q10 = [lowResvX[lowResGrid.getIndex(col1, row0)], lowResvY[lowResGrid.getIndex(col1, row0)]];
                const q11 = [lowResvX[lowResGrid.getIndex(col1, row1)], lowResvY[lowResGrid.getIndex(col1, row1)]];

                const vector = this.bilinearInterpolation(colFrac, rowFrac, q00, q01, q10, q11);
                const magnitude = Math.sqrt(vector[0] * vector[0] + vector[1] * vector[1]);
                this._vX[this._grid.getIndex(col, row)] = vector[0];
                this._vY[this._grid.getIndex(col, row)] = vector[1];
                this._magnitude[this._grid.getIndex(col, row)] = magnitude;
            }
        }
    }

    private bilinearInterpolation(
        colFrac: number,
        rowFrac: number,
        q00: number[],
        q01: number[],
        q10: number[],
        q11: number[],
    ): number[] {
        // Interpolate in x-direction
        const r1 = [
            (1 - colFrac) * q00[0] + colFrac * q10[0],
            (1 - colFrac) * q00[1] + colFrac * q10[1],
        ];
        const r2 = [
            (1 - colFrac) * q01[0] + colFrac * q11[0],
            (1 - colFrac) * q01[1] + colFrac * q11[1],
        ];
        // Interpolate in y-direction
        return [
            (1 - rowFrac) * r1[0] + rowFrac * r2[0],
            (1 - rowFrac) * r1[1] + rowFrac * r2[1],
        ];
    }
}