import { GridWithMarginBlueprint } from '../../grid/grid-with-margin';

export interface WorkerSetupWhiteNoise {
    gridBlueprint: GridWithMarginBlueprint;
    seed: number | null,
    scaleFactor: number;
}
