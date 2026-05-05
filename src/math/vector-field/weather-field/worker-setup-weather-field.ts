import { GridWithMarginBlueprint } from '../../../grid/grid-with-margin';
import { PressureRegion } from './types';

export interface WorkerSetupWeatherField {
    gridBlueprint: GridWithMarginBlueprint;
    regions: PressureRegion[];
    coriolisForce: number;
}
