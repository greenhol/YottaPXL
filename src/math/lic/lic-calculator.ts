import { BehaviorSubject, Observable } from 'rxjs';
import { Grid } from '../../grid/grid';
import { GridWithMargin } from '../../grid/grid-with-margin';
import { CalculationState, MessageFromWorker, MessageToWorker } from '../../worker/types';
import { WorkerSetupLIC as WorkerSetupLIC } from './worker-setup-lic';
import { executeWorker } from '../../worker/execute-worker';

export interface SourceData {
    grid: GridWithMargin,
    image: Float64Array,
    field: Float64Array,
}

export class LicCalculator {

    private _image: Float64Array;
    private _fieldData: Float64Array;
    private _sourceGrid: GridWithMargin;
    private _targetGrid: Grid;

    constructor(sourceData: SourceData, targetGrid: Grid) {
        this._image = sourceData.image;
        this._fieldData = sourceData.field;
        this._sourceGrid = sourceData.grid;
        this._targetGrid = targetGrid;
    }

    public calculate(maxLength: number, minLength: number = 0, strength: number = -1): Observable<CalculationState<Float64Array>> {
        const worker = new Worker(new URL('./lic-calculator.worker.ts', import.meta.url));
        const setup: WorkerSetupLIC = {
            sourceGridBlueprint: this._sourceGrid.withMarginBlueprint,
            image: this._image,
            field: this._fieldData,
            targetGridBlueprint: this._targetGrid.blueprint,
            maxLength: maxLength,
            minLength: minLength,
            strength: strength,
        }
        return executeWorker<WorkerSetupLIC, Float64Array>(worker, setup, [setup.image.buffer, setup.field.buffer])
    }
}