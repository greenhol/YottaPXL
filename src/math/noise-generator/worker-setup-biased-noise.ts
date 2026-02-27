import { GridWithMarginBlueprint } from '../../grid/grid-with-margin';
import { BiasType } from './types';

export interface WorkerSetupBiasedNoise {
    type: BiasType,
    gridBlueprint: GridWithMarginBlueprint;
}
