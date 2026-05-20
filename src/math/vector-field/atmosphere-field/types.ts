import { RGB } from '../../../types';
import { ColorMapperConfig } from '../../color/color-mapper';

export interface PerlinConfig {
    interval: number; // one interval in domain units (e.g. 8 = 8° wide cells)
    octaveCount: number;
    octaveAmplitudeFactor: number;
}

export interface VortexDescriptor {
    x0: number;
    y0: number;
    r: number;
    speed: number;
    color: RGB;
}

export interface AtmosphereDescriptor {
    seed: number;

    // World
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;

    // Band modulation
    bandCount: number;
    amplitudeFactor: number;
    phaseFactor: number;
    freqModFactor: number;
    perturbationWeight: number;

    // Perlin layer configs — one per named role
    perlinBandAmplitude: PerlinConfig;
    perlinBandPhase: PerlinConfig;
    perlinBandFreqMod: PerlinConfig;
    perlinPerturbationX: PerlinConfig;
    perlinPerturbationY: PerlinConfig;

    // Coloring
    bandGradient: ColorMapperConfig;

    // Shared
    vortices: VortexDescriptor[];
}
