import { GridWithMarginBlueprint } from '../../../grid/grid-with-margin';
import { RGB } from '../../../types';

export interface ColorSeed {
    x: number;
    y: number;
    color: RGB;
}

export interface WorkerSetupAdvectionColor {
    gridBlueprint: GridWithMarginBlueprint;
    vectorField: Float32Array;
    seeds: ColorSeed[];
    stepSize: number; // integration step size in math units
    stepCount: number; // number of backward integration steps per pixel
    influenceRadius: number; // gaussian falloff radius for seed weighting in math units
}
