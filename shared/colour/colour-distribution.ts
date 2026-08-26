import { XoRng } from '../xo-rng';
import { OkLch, RGB } from './colour';
import { converter } from './colour-converter';

interface ChannelParams {
    a: number;
    b: number;
    c: number;
    d: number;
}

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
                L: rng.nextInRange(lMin, lMax),
                c: rng.nextInRange(cMin, cMax),
                h: rng.nextInRange(0, 360),
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

/**
 * Generates `count` colours via Inigo Quilez's cosine palette formula:
 *     channel(t) = a + b * cos(2*PI * (c*t + d))
 * applied independently per R, G, B channel
 */
export function colourDistributionCosine(
    count: number,
    aMin: number,
    aMax: number,
    bMin: number,
    bMax: number,
    rng: XoRng,
): RGB[] {
    const rParams = randomChannelParams(rng, aMin, aMax, bMin, bMax);
    const gParams = randomChannelParams(rng, aMin, aMax, bMin, bMax);
    const bParams = randomChannelParams(rng, aMin, aMax, bMin, bMax);

    const colours: RGB[] = [];
    for (let i = 0; i < count; i++) {
        const t = count > 1 ? i / (count - 1) : 0;
        colours.push({
            r: toByte(cosinePalette(t, rParams)),
            g: toByte(cosinePalette(t, gParams)),
            b: toByte(cosinePalette(t, bParams)),
        });
    }

    return colours;
}

function randomChannelParams(rng: XoRng, aMin: number, aMax: number, bMin: number, bMax: number): ChannelParams {
    return {
        a: rng.nextInRange(aMin, aMax),
        b: rng.nextInRange(bMin, bMax),
        c: rng.nextIntInRange(1, 2),
        d: rng.nextInRange(0, 5),
    };
}

function cosinePalette(t: number, params: ChannelParams): number {
    return params.a + params.b * Math.cos(2 * Math.PI * (params.c * t + params.d));
}

function toByte(value: number): number {
    const clamped = Math.min(1, Math.max(0, value)); // a+b*cos(...) can exceed [0,1] depending on chosen a/b
    return Math.round(clamped * 255);
}
