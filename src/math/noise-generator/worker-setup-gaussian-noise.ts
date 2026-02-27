import { GridWithMarginBlueprint } from '../../grid/grid-with-margin';

export interface WorkerSetupGaussianNoise {
    gridBlueprint: GridWithMarginBlueprint;
    mean: number;
    standardDeviation: number;
    range: number;
}
