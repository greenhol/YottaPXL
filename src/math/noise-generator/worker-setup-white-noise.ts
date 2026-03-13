import { GridWithMarginBlueprint } from '../../grid/grid-with-margin';
import { NoiseScaleFactor } from './types';

export interface WorkerSetupWhiteNoise {
    gridBlueprint: GridWithMarginBlueprint;
    scaleFactor: NoiseScaleFactor;
}
