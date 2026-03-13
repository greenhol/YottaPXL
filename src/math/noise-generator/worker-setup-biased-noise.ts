import { GridWithMarginBlueprint } from '../../grid/grid-with-margin';
import { BiasType, NoiseScaleFactor } from './types';

export interface WorkerSetupBiasedNoise {
    type: BiasType,
    gridBlueprint: GridWithMarginBlueprint;
    scaleFactor: NoiseScaleFactor;
}
