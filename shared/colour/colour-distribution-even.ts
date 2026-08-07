import { XoRng } from '../xo-rng';
import { OkLch, RGB } from './colour';
import { converter } from './colour-converter';

export function colourDistributionEven(
    count: number,
    lMin: number = 0,
    lMax: number = 1,
    cMin: number = 0,
    cMax: number = 0.5,
    rng: XoRng,
): RGB[] {
    const candidatesPerColor = 20;

    const chosenPoints: { x: number; y: number; z: number; }[] = [];
    const results: RGB[] = [];

    for (let i = 0; i < count; i++) {
        let bestCandidate: OkLch | null = null;
        let bestPoint: { x: number; y: number; z: number; } | null = null;
        let bestScore = -Infinity;

        for (let c = 0; c < candidatesPerColor; c++) {
            const candidate: OkLch = {
                L: lMin + rng.next() * (lMax - lMin),
                c: cMin + rng.next() * (cMax - cMin),
                h: rng.next() * 360,
            };

            const hRad = (candidate.h * Math.PI) / 180;
            const point = {
                x: candidate.c * Math.cos(hRad),
                y: candidate.c * Math.sin(hRad),
                z: candidate.L,
            };

            let minDistance = Infinity;

            if (chosenPoints.length === 0) {
                minDistance = Infinity;
            } else {
                for (const existing of chosenPoints) {
                    const dx = point.x - existing.x;
                    const dy = point.y - existing.y;
                    const dz = point.z - existing.z;
                    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

                    if (distance < minDistance) {
                        minDistance = distance;
                    }
                }
            }

            if (minDistance > bestScore) {
                bestScore = minDistance;
                bestCandidate = candidate;
                bestPoint = point;
            }
        }

        if (bestCandidate && bestPoint) {
            chosenPoints.push(bestPoint);
            results.push(converter.okLchToRgb(bestCandidate));
        }
    }

    return results;
}
