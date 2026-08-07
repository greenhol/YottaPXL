import { GridWithoutRangeBlueprint } from '../../grid/grid-without-range';
import { BokehConfig } from './types';

export interface WorkerSetupBokeh {
    gridBlueprint: GridWithoutRangeBlueprint;
    config: BokehConfig;
    colourData: Uint8ClampedArray;
    zData: Float32Array;
    coverageData: Uint8ClampedArray;
}
