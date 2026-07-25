import { RGB } from '../../../../shared/colour/colour';
import { GridWithMarginBlueprint } from '../../../grid/grid-with-margin';

export interface AdvectionQuality {
    stepCount: number; // number of backward integration steps per pixel - primary quality/cost knob
    influenceRadius: number; // gaussian falloff radius for seed weighting in math units - seed reach and implicit step size
}

export interface ColourSeed {
    x: number;
    y: number;
    colour: RGB;
}

export interface WorkerSetupAdvectionColour {
    gridBlueprint: GridWithMarginBlueprint;
    vectorField: Float32Array;
    quality: AdvectionQuality;
    seeds: ColourSeed[];
}
