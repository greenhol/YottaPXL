import { GridWithMarginBlueprint } from '../../grid/grid-with-margin';
import { NoiseScaleFactor } from './types';

export interface WorkerSetupGaussianNoise {
    gridBlueprint: GridWithMarginBlueprint;
    mean: number;
    standardDeviation: number;
    range: number;
    scaleFactor: NoiseScaleFactor;
}
