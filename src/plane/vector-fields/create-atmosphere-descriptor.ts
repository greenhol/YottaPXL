import { RGB } from '../../../shared/colour/colour';
import { ColourMapper, ColourMapperConfig } from '../../../shared/colour/colour-mapper';
import { XoRng } from '../../../shared/xo-rng';
import { AtmosphereDescriptor, VortexDescriptor } from '../../math/vector-field/atmosphere-field/types';

export enum AtmosphereType {
    PRESET_1 = 'Preset 1',
    RANDOM = 'Random',
}

export function createAtmosphereDescriptor(
    type: AtmosphereType,
    bandCount: number,
    vorticesCount: number,
    vorticeMaxRadius: number,
    seed: number | null,
    bandGradient: ColourMapperConfig,
): AtmosphereDescriptor {
    const descriptor: AtmosphereDescriptor = {
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
            { x0: -90, y0: -40, r: 12, speed: 0.4, colour: null, }, // { r: 179, g: 83, b: 45 }, },  // burnt orange-red
            { x0: 20, y0: 60, r: 15, speed: 0.3, colour: null, }, // { r: 156, g: 64, b: 36 }, },    // deep rust
            { x0: 100, y0: -60, r: 10, speed: 0.6, colour: null, }, // { r: 194, g: 101, b: 58 }, }, // warm terracotta
            { x0: -120, y0: 33, r: 8, speed: 0.5, colour: null, }, // { r: 139, g: 58, b: 40 }, },   // dark brick
            { x0: -75, y0: 80, r: 11, speed: 0.15, colour: null, }, // { r: 168, g: 78, b: 42 }, },  // medium rust
            { x0: -15, y0: -65, r: 6, speed: 0.5, colour: null, }, // { r: 145, g: 72, b: 55 }, },   // brownish rust
            { x0: 55, y0: -20, r: 8, speed: 0.2, colour: null, }, // { r: 187, g: 95, b: 50 }, },    // amber rust
            { x0: 140, y0: 33, r: 5, speed: 0.5, colour: null, }, // { r: 132, g: 52, b: 38 }, },    // deep mahogany
        ],
    };

    if (type === AtmosphereType.RANDOM) {
        const effetiveSeed = (seed == null) ? XoRng.randomSeed() : seed;
        if (effetiveSeed != seed) {
            console.log(`#createAtmosphereDescriptor - new XoRNG seed created: ${effetiveSeed}`);
            descriptor.seed = effetiveSeed;
        }
        const rng = new XoRng(effetiveSeed);

        // Bands
        descriptor.bandCount = bandCount;

        // Vortices
        const gradient = ColourMapper.fromString(bandGradient.supportPoints);
        const colours = gradient.colours;
        descriptor.vortices = distributeVortices(descriptor.xMin, descriptor.xMax, descriptor.yMin, descriptor.yMax, vorticesCount, vorticeMaxRadius, colours, rng);
    }

    console.log(`#createAtmosphereDescriptor - type: ${type}, bandCount: ${descriptor.bandCount}, vorticesCount: ${descriptor.vortices.length}`);
    return descriptor;
}

function distributeVortices(
    x1: number,
    x2: number,
    y1: number,
    y2: number,
    vorticesCount: number,
    maxRadius: number,
    colours: RGB[],
    rng: XoRng,
): VortexDescriptor[] {
    const rMin = maxRadius / 4;
    const rMax = maxRadius;
    const candidatesPerCircle = 20;
    const colourCount = colours.length;
    const vortices: VortexDescriptor[] = [];

    for (let i = 0; i < vorticesCount; i++) {
        const radius = rMin + rng.next() * (rMax - rMin);
        const colour = colours[rng.nextIntInRange(0, colourCount - 1)];
        const speed = rng.nextInRange(0.1, 1);

        let bestCandidate: VortexDescriptor | null = null;
        let bestScore = -Infinity;

        for (let c = 0; c < candidatesPerCircle; c++) {
            const candidate: VortexDescriptor = {
                x0: x1 + rng.next() * (x2 - x1),
                y0: y1 + rng.next() * (y2 - y1),
                r: radius,
                colour: colour,
                speed: speed,
            };

            // Score = minimum surface-to-surface distance to any existing circle.
            // Positive = no overlap, negative = overlap. We want to maximize this.
            let minSurfaceDistance = Infinity;

            if (vortices.length === 0) {
                minSurfaceDistance = Infinity;
            } else {
                for (const existing of vortices) {
                    const dx = candidate.x0 - existing.x0;
                    const dy = candidate.y0 - existing.y0;
                    const centerDistance = Math.sqrt(dx * dx + dy * dy);
                    const surfaceDistance = centerDistance - (candidate.r + existing.r);

                    if (surfaceDistance < minSurfaceDistance) {
                        minSurfaceDistance = surfaceDistance;
                    }
                }
            }

            if (minSurfaceDistance > bestScore) {
                bestScore = minSurfaceDistance;
                bestCandidate = candidate;
            }
        }

        if (bestCandidate) {
            vortices.push(bestCandidate);
        }
    }

    return vortices;
}
