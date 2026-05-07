import { GridWithMarginBlueprint } from '../../../grid/grid-with-margin';

export interface WorkerSetupMatrixGradientField {
    gridBlueprint: GridWithMarginBlueprint;
    input: Float32Array | Float64Array;
    kernelOrder: number; // 1 - 6
    min: number;
    max: number;
}
