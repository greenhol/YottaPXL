import { GridWithMarginBlueprint } from '../../../grid/grid-with-margin';
import { PressureRegion } from './types';

export interface WorkerSetupWeatherField {
    gridBlueprint: GridWithMarginBlueprint;
    data: Float64Array;
    regions: PressureRegion[];
    coriolisForce: number;
}
