import { GridWithMarginBlueprint } from '../../grid/grid-with-margin';

export interface WorkerSetupPerlin {
    gridBlueprint: GridWithMarginBlueprint;
    scaleFactor: number;
    octaveCount: number;
    octaveAmplitudeFactor: number;
}
