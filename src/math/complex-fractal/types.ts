import { GridBlueprint } from '../../grid/grid';

export interface CalculationSetup {
    gridBlueprint: GridBlueprint;
    maxIterations: number;
    escapeValue: number;
}