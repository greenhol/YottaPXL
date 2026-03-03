import { GridWithMarginBlueprint } from '../../../grid/grid-with-margin';

export interface WorkerSetupMatrixGradientField {
    gridBlueprint: GridWithMarginBlueprint;
    input: Float64Array;
    data: Float64Array;
    min: number;
    max: number;
}
