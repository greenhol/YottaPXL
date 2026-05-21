import { ColorMapperConfig } from '../../math/color/color-mapper';
import { AtmosphereDescriptor } from '../../math/vector-field/atmosphere-field/types';

export function createAtmosphereDescriptor(
    seed: number | null,
    bandGradient: ColorMapperConfig,
): AtmosphereDescriptor {
    return {
        seed: seed ? seed : 0,
        xMin: -180,
        xMax: 180,
        yMin: -120,
        yMax: 120,
        bandCount: 5,
        warpStrength: 5,
        amplitudeFactor: 0.3,
        phaseFactor: 0.2,
        freqModFactor: 0.3,
        perturbationWeight: 0.3,
        perlinBandAmplitude: {
            interval: 8,
            octaveCount: 0,
            octaveAmplitudeFactor: 1,
        },
        perlinWarpX: {
            interval: 12,
            octaveCount: 0,
            octaveAmplitudeFactor: 1,
        },
        perlinWarpY: {
            interval: 12,
            octaveCount: 0,
            octaveAmplitudeFactor: 1,
        },
        perlinBandPhase: {
            interval: 8,
            octaveCount: 0,
            octaveAmplitudeFactor: 1,
        },
        perlinBandFreqMod: {
            interval: 8,
            octaveCount: 0,
            octaveAmplitudeFactor: 1,
        },
        perlinPerturbationX: {
            interval: 12,
            octaveCount: 0,
            octaveAmplitudeFactor: 1,
        },
        perlinPerturbationY: {
            interval: 12,
            octaveCount: 0,
            octaveAmplitudeFactor: 1,
        },
        bandGradient: bandGradient,
        vortices: [
            { x0: -90, y0: -40, r: 12, speed: 0.4, color: { r: 179, g: 83, b: 45 }, },  // burnt orange-red
            { x0: 20, y0: 60, r: 15, speed: 0.3, color: { r: 156, g: 64, b: 36 }, },    // deep rust
            { x0: 100, y0: -60, r: 10, speed: 0.6, color: { r: 194, g: 101, b: 58 }, }, // warm terracotta
            { x0: -120, y0: 33, r: 8, speed: 0.5, color: { r: 139, g: 58, b: 40 }, },   // dark brick
            { x0: -75, y0: 80, r: 11, speed: 0.15, color: { r: 168, g: 78, b: 42 }, },  // medium rust
            { x0: -15, y0: -65, r: 6, speed: 0.5, color: { r: 145, g: 72, b: 55 }, },   // brownish rust
            { x0: 55, y0: -20, r: 8, speed: 0.2, color: { r: 187, g: 95, b: 50 }, },    // amber rust
            { x0: 140, y0: 33, r: 5, speed: 0.5, color: { r: 132, g: 52, b: 38 }, },    // deep mahogany
        ],
    };
}
