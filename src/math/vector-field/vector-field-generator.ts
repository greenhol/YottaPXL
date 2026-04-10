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
    private _data: Float64Array;

    constructor(grid: GridWithMargin) {
        this._grid = grid;
        this._data = new Float64Array(this._grid.size * 3);
    }

    public createChargeField(charges: Charge[]): Observable<CalculationState<Float64Array>> {
        const worker = new Worker(new URL('./charge-field/charge-field.worker.ts', import.meta.url));
        const setup: WorkerSetupChargeField = {
            gridBlueprint: this._grid.withMarginBlueprint,
            data: this._data,
            charges: charges,
        };
        return executeWorker<WorkerSetupChargeField, Float64Array>(worker, setup, [setup.data.buffer]);
    }

    public createWeatherField(regions: PressureRegion[], coriolisForce: number): Observable<CalculationState<Float64Array>> {
        const worker = new Worker(new URL('./weather-field/weather-field.worker.ts', import.meta.url));
        const setup: WorkerSetupWeatherField = {
            gridBlueprint: this._grid.withMarginBlueprint,
            data: this._data,
            regions: regions,
            coriolisForce: coriolisForce,
        };
        return executeWorker<WorkerSetupWeatherField, Float64Array>(worker, setup, [setup.data.buffer]);
    }

    public createMatrixGradientField(input: Float64Array, min: number, max: number): Observable<CalculationState<Float64Array>> {
        const worker = new Worker(new URL('./matrix-gradient-field/matrix-gradient-field.worker.ts', import.meta.url));
        const setup: WorkerSetupMatrixGradientField = {
            gridBlueprint: this._grid.withMarginBlueprint,
            input: input,
            data: this._data,
            min: min,
            max: max,
        };
        return executeWorker<WorkerSetupMatrixGradientField, Float64Array>(worker, setup, [setup.input.buffer, setup.data.buffer]);
    }
}