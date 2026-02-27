import { BehaviorSubject, Observable } from 'rxjs';
import { Grid } from '../../grid/grid';
import { CalculationState, MessageFromWorker, MessageToWorker } from '../../worker/types';
import { CalculationType } from './types';
import { WorkerSetupMandelbrot } from './worker-setup-mandelbrot';
import { executeWorker } from '../../worker/execute-worker';

export class MandelbrotCalculator {

    /** @deprecated Use calculateIterations instead */
    public calculateIterationsSync(grid: Grid, maxIterations: number): Float64Array {
        let timeStamp = Date.now();
        const escapeValueSquared = 4; // 2^2
        const targetData = new Float64Array(grid.size);
        for (let row = 0; row < grid.height; row++) {
            for (let col = 0; col < grid.width; col++) {
                targetData[grid.getIndex(col, row)] = this.calculateIterationsForPixel(col, row, grid, maxIterations, escapeValueSquared);
            }
        }
        console.info('#calculateIterations - calculation done in ' + (Date.now() - timeStamp) / 1000 + 's');
        return targetData;
    }

    /** @deprecated Use calculateDistances instead */
    public calculateDistancesSync(grid: Grid, maxIterations: number, escapeValue: number): Float64Array {
        let timeStamp = Date.now();
        const targetData = new Float64Array(grid.size);
        for (let row = 0; row < grid.height; row++) {
            for (let col = 0; col < grid.width; col++) {
                targetData[grid.getIndex(col, row)] = this.calculateDistanceForPixel(col, row, grid, maxIterations, escapeValue);
            }
        }
        console.info('#calculateDistances - calculation done in ' + (Date.now() - timeStamp) / 1000 + 's');
        return targetData;
    }

    public calculateIterations(grid: Grid, maxIterations: number): Observable<CalculationState<Float64Array>> {
        return this.calculateWithWorker(CalculationType.ITERATIONS, grid, maxIterations, 4); // escapeValue = 2^2
    }

    public calculateDistances(grid: Grid, maxIterations: number, escapeValue: number): Observable<CalculationState<Float64Array>> {
        return this.calculateWithWorker(CalculationType.DISTANCE, grid, maxIterations, escapeValue);
    }

    private calculateWithWorker(calculytionType: CalculationType, grid: Grid, maxIterations: number, escapeValue: number): Observable<CalculationState<Float64Array>> {
        const worker = new Worker(new URL('./mandelbrot-calculator.worker.ts', import.meta.url));
        const setup: WorkerSetupMandelbrot = {
            gridBlueprint: grid.blueprint,
            type: calculytionType,
            maxIterations: maxIterations,
            escapeValue: escapeValue,
        }
        return executeWorker<WorkerSetupMandelbrot, Float64Array>(worker, setup);
    }

    private calculateIterationsForPixel(col: number, row: number, grid: Grid, maxIterations: number, escapeValueSquared: number): number {
        const [reC, imC] = grid.pixelToMath(col, row);
        let reZ = 0;
        let imZ = 0;
        let iteration = 0;
        while (reZ * reZ + imZ * imZ < escapeValueSquared && iteration < maxIterations) {
            const xTemp = reZ * reZ - imZ * imZ + reC;
            imZ = 2 * reZ * imZ + imC;
            reZ = xTemp;
            iteration++;
        }
        return iteration;
    }

    private calculateDistanceForPixel(col: number, row: number, grid: Grid, maxIterations: number, escapeValue: number): number {
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
            if (absZ > escapeValue) {
                // Distance estimation
                const absDz = Math.sqrt(reZdiff * reZdiff + imZdiff * imZdiff);
                return 2 * (absZ * Math.log(absZ)) / absDz;
            }
            iteration++;
        }
        return 0;
    }
}