import { GridWithMarginBlueprint } from '../../../grid/grid-with-margin';
import { Charge } from './types';

export interface WorkerSetupChargeField {
    gridBlueprint: GridWithMarginBlueprint;
    charges: Charge[];
}
