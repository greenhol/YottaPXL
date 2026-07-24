import { XoRng } from '../../../shared/xo-rng';
import { ColorMapper } from '../../math/color/color-mapper';
import { AdvectionQuality, ColorSeed } from '../../math/vector-field/advection-color/worker-setup-advection-color';
import { AtmosphereDescriptor } from '../../math/vector-field/atmosphere-field/types';

export function createAtmosphereColorSeeds(
    descr: AtmosphereDescriptor,
    quality: AdvectionQuality,
    vortexSeedMultiplier: number,
): ColorSeed[] {
    const rng = new XoRng(descr.seed + 8);
    const xDiff = descr.xMax * 2 - descr.xMin * 2;
    const yDiff = descr.yMax * 2 - descr.yMin * 2;

    const bandMapper = ColorMapper.fromString(descr.bandGradient.supportPoints, descr.bandGradient.easing);
    const seedSpacing = quality.influenceRadius * 0.8;
    const bandSeedCols = Math.ceil((descr.xMax - descr.xMin) / seedSpacing);
    const bandSeedRows = Math.ceil((descr.yMax - descr.yMin) / seedSpacing);
    const seeds: ColorSeed[] = [];

    // Band seeds — regular grid sampled from the gradient at each y
    for (let row = 0; row < bandSeedRows; row++) {
        for (let col = 0; col < bandSeedCols; col++) {
            const x = descr.xMin * 2 + (col / (bandSeedCols - 1)) * xDiff;
            const y = descr.yMin * 2 + (row / (bandSeedRows - 1)) * yDiff;
            const t = (y - descr.yMin * 2) / yDiff;
            seeds.push({ x, y, color: bandMapper.mapLooped(t, 0.5, 0.5) });
        }
    }

    // Vortex seeds — filled circle of seeds within each vortex radius
    const vortexSeeds: ColorSeed[] = [];
    for (const vortex of descr.vortices) {
        if (vortex.color === null) continue;
        const vortexSeedsPerVortex = Math.ceil(Math.PI * vortex.r * vortex.r / (seedSpacing * seedSpacing)) * vortexSeedMultiplier;
        let placed = 0;
        while (placed < vortexSeedsPerVortex) {
            // Uniform random sampling within the unit circle, scaled to vortex radius
            const angle = rng.next() * 2 * Math.PI;
            const radius = Math.sqrt(rng.next()) * vortex.r * 2;
            const x = vortex.x0 + Math.cos(angle) * radius;
            const y = vortex.y0 + Math.sin(angle) * radius;
            vortexSeeds.push({ x, y, color: vortex.color });
            placed++;
        }
    }
    seeds.push(...vortexSeeds);

    return seeds;
}
