import { GridWithMarginBlueprint } from '../../grid/grid-with-margin';

export interface WorkerSetupGaussianNoise {
    gridBlueprint: GridWithMarginBlueprint;
    seed: number | null,
    mean: number;
    standardDeviation: number;
    range: number;
    scaleFactor: number;
}
