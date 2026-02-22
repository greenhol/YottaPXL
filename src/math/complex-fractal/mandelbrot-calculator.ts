import { BehaviorSubject, Observable } from 'rxjs';
import { Grid } from '../../grid/grid';
import { CalculationSetup } from './types';
import { MessageFromWorker, MessageToWorker } from '../../worker/types';

export interface CalculationState {
    progress: number;
    data?: Float64Array;
}

export enum CalculationType {
    ITERATIONS,
    DISTANCE,
}

export class MandelbrotCalculator {

    private _escapeValue: number;
    private _escapeValueSquared: number;

    private _calculationState$ = new BehaviorSubject<CalculationState>({ progress: 0 });
    public calculationState$: Observable<CalculationState> = this._calculationState$;

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

    public calculateWithWorker(grid: Grid, maxIterations: number, type: CalculationType) {
        const worker: Worker = type == CalculationType.ITERATIONS ?
            new Worker(new URL('./mandelbrot-iterations.worker.ts', import.meta.url)) :
            new Worker(new URL('./mandelbrot-distance.worker.ts', import.meta.url));

        const setup: CalculationSetup = {
            gridBlueprint: grid.blueprint,
            maxIterations: maxIterations,
            escapeValue: this._escapeValue,
        }
        worker.postMessage({ type: MessageToWorker.START, data: setup });
        worker.onmessage = (e) => {
            switch (e.data.type) {
                case MessageFromWorker.UPDATE: {
                    this._calculationState$.next({ progress: e.data.progress });
                    break;
                }
                case MessageFromWorker.RESULT: {
                    this._calculationState$.next({ progress: 100, data: e.data.result as Float64Array });
                    this._calculationState$.complete();
                    break;
                }
                default: { console.warn(`#calculateIterationsWithWorker - unknown message type: ${e.data.type}`) }
            }
        };
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
                return 2 * (absZ * Math.log(absZ)) / absDz;
            }
            iteration++;
        }
        return 0;
    }
}