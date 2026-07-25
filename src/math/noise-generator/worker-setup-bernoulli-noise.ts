import { GridWithMarginBlueprint } from '../../grid/grid-with-margin';
import { BernoulliNoiseType } from './types/bernoulli-noise-type';

export interface WorkerSetupBernoulliNoise {
    gridBlueprint: GridWithMarginBlueprint;
    seed: number | null,
    type: BernoulliNoiseType,
    p: number;
    scaleFactor: number;
}
