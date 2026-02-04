import { Grid } from '../../grid/grid';

export class MandelbrotCalculator {

    private _escapeValue: number;
    private _escapeValueSquared: number;

    constructor(escapeValue: number = 2) {
        this._escapeValue = escapeValue;
        this._escapeValueSquared = Math.pow(escapeValue, 2);
    }

    public calculateIterations(grid: Grid, maxIterations: number): Float64Array {
        let timeStamp = Date.now();
        const targetData = new Float64Array(grid.size);
        for (let row = 0; row < grid.height; row++) {
            for (let col = 0; col < grid.width; col++) {
                targetData[grid.getIndex(col, row)] = this.calculateIterationsForPixel(col, row, grid, maxIterations);
            }
        }
        console.info('#calculateIterations - calculation done in ' + (Date.now() - timeStamp) / 1000 + 's');
        return targetData;
    }

    public calculateDistances(grid: Grid, maxIterations: number): Float64Array {
        let timeStamp = Date.now();
        const targetData = new Float64Array(grid.size);
        for (let row = 0; row < grid.height; row++) {
            for (let col = 0; col < grid.width; col++) {
                targetData[grid.getIndex(col, row)] = this.calculateDistanceForPixel(col, row, grid, maxIterations);
            }
        }
        console.info('#calculateDistances - calculation done in ' + (Date.now() - timeStamp) / 1000 + 's');
        return targetData;
    }

    private calculateIterationsForPixel(col: number, row: number, grid: Grid, maxIterations: number): number {
        const [reC, imC] = grid.pixelToMath(col, row);
        let reZ = 0;
        let imZ = 0;
        let iteration = 0;
        while (reZ * reZ + imZ * imZ < this._escapeValueSquared && iteration < maxIterations) {
            const xTemp = reZ * reZ - imZ * imZ + reC;
            imZ = 2 * reZ * imZ + imC;
            reZ = xTemp;
            iteration++;
        }
        return iteration;
    }

    private calculateDistanceForPixel(col: number, row: number, grid: Grid, maxIterations: number): number {
        const [reC, imC] = grid.pixelToMath(col, row);

        let reZ = 0;
        let imZ = 0;
        let reZdiff = 0;
        let imZdiff = 0;
        let iteration = 0;

        while (iteration < maxIterations) {
            // z = z^2 + c
            const re_z_squared = reZ * reZ - imZ * imZ;
            const im_z_squared = 2 * reZ * imZ;
            reZ = re_z_squared + reC;
            imZ = im_z_squared + imC;

            // dz = 2 * z * dz + 1
            const reTemp = 2 * (reZ * reZdiff - imZ * imZdiff) + 1;
            const imTemp = 2 * (reZ * imZdiff + imZ * reZdiff);
            reZdiff = reTemp;
            imZdiff = imTemp;

            const absZ = Math.sqrt(reZ * reZ + imZ * imZ);
            if (absZ > this._escapeValue) {
                // Distance estimation
                const absDz = Math.sqrt(reZdiff * reZdiff + imZdiff * imZdiff);
                const d = 2 * (absZ * Math.log(absZ)) / absDz;
                return d;
            }
            iteration++;
        }
        return 0;
    }
}