import { Observable } from 'rxjs';
import { GridWithoutRange } from '../../grid/grid-without-range';
import { executeWorker } from '../../worker/execute-worker';
import { CalculationState } from '../../worker/types';
import { BokehConfig } from './types';
import { WorkerSetupBokeh } from './worker-setup-bokeh';

export interface SourceData {
    grid: GridWithoutRange,
    colourData: Uint8ClampedArray;
    zData: Float32Array;
    coverageData: Uint8ClampedArray;
}

export class BokehProcessor {

    public process(sourceData: SourceData, config: BokehConfig): Observable<CalculationState<Uint8ClampedArray>> {
        const worker = new Worker(new URL('./bokeh-processor.worker.ts', import.meta.url));
        const setup: WorkerSetupBokeh = {
            gridBlueprint: sourceData.grid.withoutRangeBlueprint,
            config: config,
            colourData: sourceData.colourData,
            zData: sourceData.zData,
            coverageData: sourceData.coverageData,
        };
        return executeWorker<WorkerSetupBokeh, Uint8ClampedArray>(worker, setup, [setup.colourData.buffer, setup.zData.buffer, setup.coverageData.buffer]);
    }
}
