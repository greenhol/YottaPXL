import { Grid } from '../../../grid/grid';

export interface Vector {
    vX: number;
    vXn: number;
    vY: number;
    vYn: number;
    value: number;
}

interface Charge {
    x: number;
    y: number;
    magnitude: number;
}

export class ChargeField {

    private charges: Charge[];

    constructor() {
        this.charges = [
            { x: -0.4, y: -0.1, magnitude: 0.01 },
            { x: 0.4, y: 0.2, magnitude: -0.01 }
        ];
    }

    public getVector(x: number, y: number): Vector {
        let v: Vector = {
            vX: 0,
            vXn: 1,
            vY: 0,
            vYn: 0,
            value: 1,
        };

        for (let i = 0; i < this.charges.length; i++) {
            const rdX = x - this.charges[i].x;
            const rdY = y - this.charges[i].y;
            const rdValue = Math.sqrt(rdX * rdX + rdY * rdY);
            v.vX += this.charges[i].magnitude * rdX / Math.pow(rdValue, 3);
            v.vY += this.charges[i].magnitude * rdY / Math.pow(rdValue, 3);
        }

        // Rotate for Potential
        // v = { vX: -v.vY, vXn: 1, vY: v.vX, vYn: 0, value: 1 };

        v.value = Math.sqrt(v.vX * v.vX + v.vY * v.vY);
        v.vXn = v.vX / v.value;
        v.vYn = v.vY / v.value;

        return v;
    }
}