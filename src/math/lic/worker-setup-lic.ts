import { GridBlueprint } from '../../grid/grid';
import { GridWithMarginBlueprint } from '../../grid/grid-with-margin';
import { LicConfig } from './types';

export interface WorkerSetupLIC {
    sourceGridBlueprint: GridWithMarginBlueprint;
    image: Float64Array,
    field: Float64Array;
    orthogonal: boolean;
    targetGridBlueprint: GridBlueprint;
    licConfig: LicConfig;
}
