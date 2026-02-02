import { Grid } from '../../grid/grid';

export class MandelbrotCalculator {

    private _escapeValue: number;

    constructor(escapeValue: number = 2) {
        this._escapeValue = Math.pow(escapeValue, 2);
    }

    public calculateIterations(grid: Grid, maxIterations: number): Float64Array {
        const targetData = new Float64Array(grid.size);
        for (let row = 0; row < grid.height; row++) {
            for (let col = 0; col < grid.width; col++) {
                targetData[grid.getIndex(col, row)] = this.calculateIterationsForPixel(col, row, grid, maxIterations);
            }
        }
        return targetData;
    }

    public calculateDistances(grid: Grid, maxIterations: number): Float64Array {
        const targetData = new Float64Array(grid.size);
        for (let row = 0; row < grid.height; row++) {
            for (let col = 0; col < grid.width; col++) {
                targetData[grid.getIndex(col, row)] = this.calculateDistanceForPixel(col, row, grid, maxIterations);
            }
        }
        return targetData;
    }

    private calculateIterationsForPixel(col: number, row: number, grid: Grid, maxIterations: number): number {
        const [reC, imC] = grid.pixelToMath(col, row);
        let reZ = 0;
        let imZ = 0;
        let iteration = 0;
        while (reZ * reZ + imZ * imZ < this._escapeValue && iteration < maxIterations) {
            const xTemp = reZ * reZ - imZ * imZ + reC;
            imZ = 2 * reZ * imZ + imC;
            reZ = xTemp;
            iteration++;
        }
        return iteration;
    }

    private calculateDistanceForPixel(col: number, row: number, grid: Grid, maxIterations: number): number {
        const [reC, imC] = grid.pixelToMath(col, row);
        let [reZ, imZ, dreZ, dimZ] = [0, 0, 0, 0];
        let iteration = 0;

        while (iteration < maxIterations) {
            const reZsquared = reZ * reZ;
            const imZsquared = imZ * imZ;

            if (reZsquared + imZsquared > this._escapeValue) {
                const zMagnitude = Math.sqrt(reZsquared + imZsquared);
                const distance = 2 * zMagnitude * Math.log(zMagnitude) / Math.sqrt(dreZ * dreZ + dimZ * dimZ);
                return distance;
            }

            const newDzx = 2 * reZ * dreZ - imZ * dimZ + 1;
            const newDzy = 2 * reZ * dimZ + imZ * dreZ;

            const newZx = reZsquared - imZsquared + reC;
            const newZy = 2 * reZ * imZ + imC;

            reZ = newZx;
            imZ = newZy;
            dreZ = newDzx;
            dimZ = newDzy;

            iteration++;
        }
        return 0;
    }
}