import { GridBlueprint } from '../../grid/grid';

export interface WorkerSetup {
    gridBlueprint: GridBlueprint;
    calculateDistance: boolean,
    maxIterations: number;
    escapeValue: number;
}
