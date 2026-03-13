import { GridWithMarginBlueprint } from '../../grid/grid-with-margin';
import { BernoulliNoiseType, NoiseScaleFactor } from './types';

export interface WorkerSetupBernoulliNoise {
    type: BernoulliNoiseType,
    gridBlueprint: GridWithMarginBlueprint;
    p: number;
    scaleFactor: NoiseScaleFactor;
}
