import { GridBlueprint } from '../../grid/grid';
import { GridWithMarginBlueprint } from '../../grid/grid-with-margin';

export interface WorkerSetup {
    sourceGridBlueprint: GridWithMarginBlueprint;
    image: Float64Array,
    field: Float64Array;
    targetGridBlueprint: GridBlueprint;
    maxLength: number;
    minLength: number;
    strength: number;
}

export interface PointInPixel {
    rowDiff: number;
    colDiff: number;
    x: number;
    y: number;
    distance: number;
}
