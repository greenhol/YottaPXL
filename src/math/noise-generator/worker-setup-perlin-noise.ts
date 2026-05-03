import { GridWithMarginBlueprint } from '../../grid/grid-with-margin';

export interface WorkerSetupPerlinNoise {
    gridBlueprint: GridWithMarginBlueprint;
    scaleFactor: number;
    octaveCount: number;
    octaveAmplitudeFactor: number;
}
