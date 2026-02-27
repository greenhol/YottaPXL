import { GridWithMarginBlueprint } from '../../grid/grid-with-margin';
import { BernoulliNoiseType } from './types';

export interface WorkerSetupBernoulliNoise {
    type: BernoulliNoiseType,
    gridBlueprint: GridWithMarginBlueprint;
    p: number;
}
