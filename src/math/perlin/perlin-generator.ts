import { Observable } from 'rxjs';
import { GridWithMargin } from '../../grid/grid-with-margin';
import { executeWorker } from '../../worker/execute-worker';
import { CalculationState } from '../../worker/types';
import { WorkerSetupPerlin } from './worker-setup-perlin';

export class PerlinGenerator {

    private _grid: GridWithMargin;

    constructor(grid: GridWithMargin) {
        this._grid = grid;
    }

    public createNoise(seed: number | null, octaveCount: number, octaveAmplitudeFactor: number, scaleFactor: number): Observable<CalculationState<Float32Array>> {
        const worker = new Worker(new URL('./perlin-generator-scalar.worker.ts', import.meta.url));
        const setup: WorkerSetupPerlin = {
            gridBlueprint: this._grid.withMarginBlueprint,
            seed: seed,
            octaveCount: octaveCount,
            octaveAmplitudeFactor: octaveAmplitudeFactor,
            scaleFactor: scaleFactor,
        };
        return executeWorker<WorkerSetupPerlin, Float32Array>(worker, setup);
    }

    public createField(seed: number | null, octaveCount: number, octaveAmplitudeFactor: number, scaleFactor: number): Observable<CalculationState<Float32Array>> {
        const worker = new Worker(new URL('./perlin-generator-vector.worker.ts', import.meta.url));
        const setup: WorkerSetupPerlin = {
            gridBlueprint: this._grid.withMarginBlueprint,
            seed: seed,
            octaveCount: octaveCount,
            octaveAmplitudeFactor: octaveAmplitudeFactor,
            scaleFactor: scaleFactor,
        };
        return executeWorker<WorkerSetupPerlin, Float32Array>(worker, setup);
    }
}