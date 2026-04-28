import { GridBlueprint } from '../../grid/grid';
import { CalculationType } from './types';

export interface WorkerSetupMandelbrot {
    gridBlueprint: GridBlueprint;
    type: CalculationType,
    referenceCoordinate: string,
    maxIterations: number;
    escapeValue: number;
}
