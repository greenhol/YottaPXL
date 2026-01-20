import { Grid } from '../../grid/grid';

export class MandelbrotCalculator {

    public calculate(grid: Grid, maxIterations: number): Float64Array {
        const targetData = new Float64Array(grid.size);
        for (let row = 0; row < grid.height; row++) {
            for (let col = 0; col < grid.width; col++) {
                targetData[grid.getIndex(col, row)] = this.calculateSingleValue(col, row, grid, maxIterations);
            }
        }
        return targetData;
    }

    private calculateSingleValue(col: number, row: number, grid: Grid, maxIterations: number): number {
        const [reC, imC] = grid.pixelToMath(col, row);
        let reZ = 0;
        let imZ = 0;
        let iteration = 0;
        while (reZ * reZ + imZ * imZ < 4 && iteration < maxIterations) {
            const xTemp = reZ * reZ - imZ * imZ + reC;
            imZ = 2 * reZ * imZ + imC;
            reZ = xTemp;
            iteration++;
        }
        return iteration;
    }
}