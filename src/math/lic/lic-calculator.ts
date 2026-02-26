import { BehaviorSubject, Observable } from 'rxjs';
import { Grid } from '../../grid/grid';
import { GridWithMargin } from '../../grid/grid-with-margin';
import { MessageFromWorker, MessageToWorker } from '../../worker/types';
import { WorkerSetup } from './worker-setup';

export interface CalculationState {
    progress: number;
    data?: Float64Array;
}

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

    public calculate(maxLength: number, minLength: number = 0, strength: number = -1): Observable<CalculationState> {
        const worker = new Worker(new URL('./lic-calculator.worker.ts', import.meta.url));
        const calculationState$ = new BehaviorSubject<CalculationState>({ progress: 0 });

        const setup: WorkerSetup = {
            sourceGridBlueprint: this._sourceGrid.withMarginBlueprint,
            image: this._image,
            field: this._fieldData,
            targetGridBlueprint: this._targetGrid.blueprint,
            maxLength: maxLength,
            minLength: minLength,
            strength: strength,
        }

        worker.postMessage(
            { type: MessageToWorker.START, data: setup },
            [setup.image.buffer, setup.field.buffer],
        );
        worker.onmessage = (e) => {
            switch (e.data.type) {
                case MessageFromWorker.UPDATE: {
                    calculationState$.next({ progress: e.data.progress });
                    break;
                }
                case MessageFromWorker.RESULT: {
                    calculationState$.next({ progress: 100, data: e.data.result as Float64Array });
                    calculationState$.complete();
                    worker.terminate();
                    break;
                }
                default: { console.warn(`#calculateIterationsWithWorker - unknown message type: ${e.data.type}`) }
            }
        };
        return calculationState$;
    }
}