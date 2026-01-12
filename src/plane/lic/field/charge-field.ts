import { Grid } from '../../../grid/grid';

interface Charge {
    x: number;
    y: number;
    magnitude: number;
}

export class ChargeField {

    private _grid: Grid;
    private _vX: Float64Array;
    private _vY: Float64Array;

    private charges: Charge[];

    constructor(grid: Grid) {
        this.charges = [
            { x: -0.4, y: -0.1, magnitude: 0.01 },
            { x: 0.4, y: 0.2, magnitude: -0.01 }
        ];
        this._grid = grid;
        this.precomputeVectors();
    }

    public getVector(j: number, i: number): [number, number] {
        return [
            this._vX[this._grid.getIndex(j, i)],
            this._vY[this._grid.getIndex(j, i)],
        ];
    }

    private precomputeVectors() {
        this._vX = new Float64Array(this._grid.size);
        this._vY = new Float64Array(this._grid.size);
        for (let i = 0; i < this._grid.height; i++) {
            for (let j = 0; j < this._grid.width; j++) {
                const [x, y] = this._grid.pixelToMath(j, i);
                const [vX, vY] = this.computeVector(x, y);
                this._vX[this._grid.getIndex(j, i)] = vX;
                this._vY[this._grid.getIndex(j, i)] = vY;
            }
        }
    }

    private computeVector(x: number, y: number): [number, number] {
        let vX = 0;
        let vXn = 1;
        let vY = 0;
        let vYn = 0;
        let value = 1;

        for (let i = 0; i < this.charges.length; i++) {
            const rdX = x - this.charges[i].x;
            const rdY = y - this.charges[i].y;
            const rdValue = Math.sqrt(rdX * rdX + rdY * rdY);
            vX += this.charges[i].magnitude * rdX / Math.pow(rdValue, 3);
            vY += this.charges[i].magnitude * rdY / Math.pow(rdValue, 3);
        }

        // Rotate for Potential
        // v = { vX: -v.vY, vXn: 1, vY: v.vX, vYn: 0, value: 1 };

        value = Math.sqrt(vX * vX + vY * vY);
        vXn = vX / value;
        vYn = vY / value;

        return [vXn, vYn];
    }
}