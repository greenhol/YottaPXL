import { Observable } from 'rxjs';
import { GridWithMargin } from '../../grid/grid-with-margin';
import { executeWorker } from '../../worker/execute-worker';
import { CalculationState } from '../../worker/types';
import { Charge } from './charge-field/types';
import { WorkerSetupChargeField } from './charge-field/worker-setup-charge-field';
import { WorkerSetupMatrixGradientField } from './matrix-gradient-field/worker-setup-matrix-gradient-field';
import { PressureRegion } from './weather-field/types';
import { WorkerSetupWeatherField } from './weather-field/worker-setup-weather-field';

export class VectorFieldGenerator {

    private _grid: GridWithMargin;

    constructor(grid: GridWithMargin) {
        this._grid = grid;
    }

    public createChargeField(charges: Charge[]): Observable<CalculationState<Float32Array>> {
        const worker = new Worker(new URL('./charge-field/charge-field.worker.ts', import.meta.url));
        const setup: WorkerSetupChargeField = {
            gridBlueprint: this._grid.withMarginBlueprint,
            charges: charges,
        };
        return executeWorker<WorkerSetupChargeField, Float32Array>(worker, setup);
    }

    public createWeatherField(regions: PressureRegion[], coriolisForce: number): Observable<CalculationState<Float32Array>> {
        const worker = new Worker(new URL('./weather-field/weather-field.worker.ts', import.meta.url));
        const setup: WorkerSetupWeatherField = {
            gridBlueprint: this._grid.withMarginBlueprint,
            regions: regions,
            coriolisForce: coriolisForce,
        };
        return executeWorker<WorkerSetupWeatherField, Float32Array>(worker, setup);
    }

    public createMatrixGradientField(input: Float32Array | Float64Array, min: number, max: number, kernelOrder: number = 2): Observable<CalculationState<Float32Array>> {
        const worker = new Worker(new URL('./matrix-gradient-field/matrix-gradient-field.worker.ts', import.meta.url));
        const setup: WorkerSetupMatrixGradientField = {
            gridBlueprint: this._grid.withMarginBlueprint,
            input: input,
            kernelOrder: kernelOrder,
            min: min,
            max: max,
        };
        return executeWorker<WorkerSetupMatrixGradientField, Float32Array>(worker, setup, [setup.input.buffer]);
    }
}