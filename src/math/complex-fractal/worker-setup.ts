import { GridBlueprint } from '../../grid/grid';

export interface WorkerSetup {
    gridBlueprint: GridBlueprint;
    type: CalculationType,
    maxIterations: number;
    escapeValue: number;
}

export enum CalculationType {
    ITERATIONS,
    DISTANCE,
}