import { GridBlueprint } from '../../grid/grid';
import { CalculationType } from './types';

export interface WorkerSetupMandelbrot {
    gridBlueprint: GridBlueprint;
    type: CalculationType,
    maxIterations: number;
    escapeValue: number;
}
