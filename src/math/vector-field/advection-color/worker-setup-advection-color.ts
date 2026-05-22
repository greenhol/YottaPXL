import { GridWithMarginBlueprint } from '../../../grid/grid-with-margin';
import { RGB } from '../../../types';

export interface AdvectionQuality {
    stepCount: number; // number of backward integration steps per pixel - primary quality/cost knob
    influenceRadius: number; // gaussian falloff radius for seed weighting in math units - seed reach and implicit step size
}

export interface ColorSeed {
    x: number;
    y: number;
    color: RGB;
}

export interface WorkerSetupAdvectionColor {
    gridBlueprint: GridWithMarginBlueprint;
    vectorField: Float32Array;
    quality: AdvectionQuality;
    seeds: ColorSeed[];
}
