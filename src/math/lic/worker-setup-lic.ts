import { GridBlueprint } from '../../grid/grid';
import { GridWithMarginBlueprint } from '../../grid/grid-with-margin';

export interface WorkerSetupLIC {
    sourceGridBlueprint: GridWithMarginBlueprint;
    image: Float64Array,
    field: Float64Array;
    targetGridBlueprint: GridBlueprint;
    maxLength: number;
    minLength: number;
    strength: number;
}
