import { XoRng } from '../../../shared/xo-rng';
import { ColorMapper, Easing } from '../../math/color/color-mapper';
import { ColorSeed } from '../../math/vector-field/advection-color/worker-setup-advection-color';
import { AtmosphereDescriptor } from '../../math/vector-field/atmosphere-field/types';

export function createAtmosphereColorSeeds(
    descr: AtmosphereDescriptor,
    bandSeedCols: number,
    bandSeedRows: number,
    vortexSeedsPerVortex: number,  // e.g. 50-200
): ColorSeed[] {
    const rng = new XoRng(descr.seed + 8);
    const xDiff = descr.xMax * 2 - descr.xMin * 2;
    const yDiff = descr.yMax * 2 - descr.yMin * 2;

    const bandMapper = ColorMapper.fromString(descr.bandGradient.supportPoints, descr.bandGradient.easing);
    const seeds: ColorSeed[] = [];
    const bandSeeds: ColorSeed[] = [];
    const vortexSeeds: ColorSeed[] = [];

    // Band seeds — regular grid sampled from the gradient at each y
    for (let row = 0; row < bandSeedRows; row++) {
        for (let col = 0; col < bandSeedCols; col++) {
            const x = descr.xMin * 2 + (col / (bandSeedCols - 1)) * xDiff;
            const y = descr.yMin * 2 + (row / (bandSeedRows - 1)) * yDiff;
            const t = (y - descr.yMin * 2) / yDiff;
            bandSeeds.push({ x, y, color: bandMapper.mapLooped(t, 0.5, 0.5) });
        }
    }

    // Remove band seeds that fall inside any vortex exclusion zone
    // const exclusionFactor = 1.5;
    // const filteredBandSeeds = bandSeeds.filter(seed =>
    //     !descr.vortices.some(vortex => {
    //         const dx = seed.x - vortex.x0;
    //         const dy = seed.y - vortex.y0;
    //         const d2 = dx * dx + dy * dy;
    //         const exclusionR = vortex.r * exclusionFactor;
    //         return d2 < exclusionR * exclusionR;
    //     })
    // );
    seeds.push(...bandSeeds);

    // Vortex seeds — filled circle of seeds within each vortex radius
    for (const vortex of descr.vortices) {
        let placed = 0;
        while (placed < vortexSeedsPerVortex) {
            // Uniform random sampling within the unit circle, scaled to vortex radius
            const angle = rng.next() * 2 * Math.PI;
            const radius = Math.sqrt(rng.next()) * vortex.r;
            const x = vortex.x0 + Math.cos(angle) * radius;
            const y = vortex.y0 + Math.sin(angle) * radius;
            vortexSeeds.push({ x, y, color: vortex.color });
            placed++;
        }
    }
    seeds.push(...vortexSeeds);

    return seeds;
}
