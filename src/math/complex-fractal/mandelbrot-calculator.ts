import { Observable } from 'rxjs';
import { Grid } from '../../grid/grid';
import { executeWorker } from '../../worker/execute-worker';
import { CalculationState } from '../../worker/types';
import { CalculationType } from './types';
import { WorkerSetupMandelbrot } from './worker-setup-mandelbrot';

export class MandelbrotCalculator {

    public calculateIterations(grid: Grid, maxIterations: number): Observable<CalculationState<Float64Array>> {
        return this.calculateWithWorker(CalculationType.ITERATIONS, grid, maxIterations, 4); // escapeValue = 2^2
    }

    public calculateSmoothIterations(grid: Grid, maxIterations: number): Observable<CalculationState<Float64Array>> {
        return this.calculateWithWorker(CalculationType.ITERATIONS_SMOOTH, grid, maxIterations, 4); // escapeValue = 2^2
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
}