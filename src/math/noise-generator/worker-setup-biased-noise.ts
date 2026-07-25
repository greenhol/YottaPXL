import { GridWithMarginBlueprint } from '../../grid/grid-with-margin';
import { BiasType } from './types/bias-type';

export interface WorkerSetupBiasedNoise {
    gridBlueprint: GridWithMarginBlueprint;
    seed: number | null,
    type: BiasType,
    scaleFactor: number;
}
