import { Observable } from 'rxjs';
import { Grid } from '../../grid/grid';
import { GridWithMargin } from '../../grid/grid-with-margin';
import { executeWorker } from '../../worker/execute-worker';
import { CalculationState } from '../../worker/types';
import { WorkerSetupLIC } from './worker-setup-lic';
import { LicConfig } from './types';

export interface SourceData {
    grid: GridWithMargin,
    image: Float32Array,
    field: Float32Array,
}

export class LicCalculator {

    private _image: Float32Array;
    private _fieldData: Float32Array;
    private _orthogonal: boolean;
    private _sourceGrid: GridWithMargin;
    private _targetGrid: Grid;

    constructor(sourceData: SourceData, targetGrid: Grid, orthogonal: boolean = false) {
        this._image = sourceData.image;
        this._fieldData = sourceData.field;
        this._orthogonal = orthogonal;
        this._sourceGrid = sourceData.grid;
        this._targetGrid = targetGrid;
    }

    public calculate(licConfig: LicConfig): Observable<CalculationState<Float64Array>> {
        const worker = new Worker(new URL('./lic-calculator.worker.ts', import.meta.url));
        const setup: WorkerSetupLIC = {
            sourceGridBlueprint: this._sourceGrid.withMarginBlueprint,
            image: this._image,
            field: this._fieldData,
            orthogonal: this._orthogonal,
            targetGridBlueprint: this._targetGrid.blueprint,
            licConfig: licConfig,
        };
        return executeWorker<WorkerSetupLIC, Float64Array>(worker, setup, [setup.image.buffer]);
    }
}