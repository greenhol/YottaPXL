import { GridWithMarginBlueprint } from '../../../grid/grid-with-margin';
import { Charge } from './types';

export interface WorkerSetupChargeField {
    gridBlueprint: GridWithMarginBlueprint;
    data: Float64Array;
    charges: Charge[];
}
