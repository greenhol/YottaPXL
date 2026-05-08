import { GridWithMarginBlueprint } from '../../grid/grid-with-margin';
import { BiasType } from './types';

export interface WorkerSetupBiasedNoise {
    gridBlueprint: GridWithMarginBlueprint;
    seed: number | null,
    type: BiasType,
    scaleFactor: number;
}
