import { GridWithMarginBlueprint } from '../../grid/grid-with-margin';

export interface WorkerSetupPerlin {
    gridBlueprint: GridWithMarginBlueprint;
    seed: number | null,
    octaveCount: number;
    octaveAmplitudeFactor: number;
    scaleFactor: number;
}
