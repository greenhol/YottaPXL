import { GridWithMargin } from '../../grid/grid-with-margin';
import { VectorField } from './vector-field';

interface Charge {
    x: number;
    y: number;
    charge: number;
}

export class ChargeField extends VectorField {

    private charges: Charge[];

    constructor(grid: GridWithMargin) {
        super(grid);
        this.charges = [
            { x: 3, y: -1, charge: 5 },
            { x: 5.5, y: -0.5, charge: -10 },
            { x: 7, y: 2, charge: 3 },
        ];
        this.precomputeVectors();
    }

    override computeVector(x: number, y: number): [number, number, number] {
        let vX = 0;
        let vY = 0;
        for (let i = 0; i < this.charges.length; i++) {
            const rdX = x - this.charges[i].x;
            const rdY = y - this.charges[i].y;
            const rdValue = Math.sqrt(rdX * rdX + rdY * rdY);
            vX += this.charges[i].charge * rdX / Math.pow(rdValue, 3);
            vY += this.charges[i].charge * rdY / Math.pow(rdValue, 3);
        }

        // Rotate for Potential
        // const temp = vX;
        // vX = -vY;
        // vY = temp;

        const magnitude = Math.sqrt(vX * vX + vY * vY);
        const value = Math.sqrt(vX * vX + vY * vY);
        return [
            vX / value,
            vY / value,
            magnitude,
        ];
    }
}