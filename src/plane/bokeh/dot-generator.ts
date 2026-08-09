import { RGB, RGBA } from '../../../shared/colour/colour';
import { colourDistributionEven } from '../../../shared/colour/colour-distribution-even';
import { ColourMapper, Easing } from '../../../shared/colour/colour-mapper';
import { XoRng } from '../../../shared/xo-rng';

export enum DotDistributionType {
    RANDOM = 'Random',
    RANDOM_EVENLY = 'Random but distributed evenly',
    RANDOM_WALK = 'Random Walk',
    ORDERED_1 = 'Ordered by Z - Variant 1',
    ORDERED_2 = 'Ordered by Z - Variant 2',
}

export interface DotGeneratorConfig {
    type: DotDistributionType;
    seed: number | null;
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
    count: number;
    minRadius: number;
    maxRadius: number;
    zMin: number;
    zMax: number;
}

export interface Dot {
    x: number;
    y: number;
    z: number;
    r: number;
    colour: RGBA;
}

export class DotGenerator {

    public generate(config: DotGeneratorConfig): Dot[] {
        switch (config.type) {
            case DotDistributionType.RANDOM: return this.purelyRandom(config);
            case DotDistributionType.RANDOM_EVENLY: return this.evenlyRandom(config);
            case DotDistributionType.RANDOM_WALK: return this.randomWalk(config);
            case DotDistributionType.ORDERED_1: return this.ordered1(config);
            case DotDistributionType.ORDERED_2: return this.ordered2(config);
        }
    }

    private purelyRandom(config: DotGeneratorConfig): Dot[] {
        const rng = new XoRng(config.seed);
        const dots: Dot[] = [];
        const colours = this.randomSaturatedColour(config.count, rng);
        for (let i = 0; i < config.count; i++) {
            dots.push({
                x: rng.nextInRange(config.xMin, config.xMax),
                y: rng.nextInRange(config.yMin, config.yMax),
                z: rng.nextInRange(config.zMin, config.zMax),
                r: rng.nextInRange(config.minRadius, config.maxRadius),
                colour: colours[i],
            });
        }
        return dots;
    }

    private evenlyRandom(config: DotGeneratorConfig): Dot[] {
        const candidatesPerCircle = 20;

        const rng = new XoRng(config.seed);
        const dots: Dot[] = [];
        const colours = this.randomSaturatedColour(config.count, rng);

        for (let i = 0; i < config.count; i++) {
            const radius = config.minRadius + rng.next() * (config.maxRadius - config.minRadius);
            const z = rng.nextInRange(config.zMin, config.zMax);

            let bestCandidate: Dot | null = null;
            let bestScore = -Infinity;

            for (let c = 0; c < candidatesPerCircle; c++) {
                const candidate: Dot = {
                    x: config.xMin + rng.next() * (config.xMax - config.xMin),
                    y: config.yMin + rng.next() * (config.yMax - config.yMin),
                    r: radius,
                    colour: colours[i],
                    z: z,
                };

                let minSurfaceDistance = Infinity;

                if (dots.length === 0) {
                    minSurfaceDistance = Infinity;
                } else {
                    for (const existing of dots) {
                        const dx = candidate.x - existing.x;
                        const dy = candidate.y - existing.y;
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
                dots.push(bestCandidate);
            }
        }

        return dots;
    }

    private ordered1(config: DotGeneratorConfig): Dot[] {
        const rng = new XoRng(config.seed);
        const dots: Dot[] = [];

        for (let row = -2; row <= 2; row++) {
            for (let col = 0; col <= 10; col++) {
                dots.push({
                    x: col,
                    y: row,
                    z: col - 5,
                    r: 0.25 + Math.abs(row) / 4,
                    colour: { r: 0, g: 0, b: 0, a: 0 },
                });
            }
        }

        const colours = this.randomSaturatedColour(dots.length, rng);
        dots.forEach((dot, index) => dot.colour = colours[index]);

        return dots;
    }

    private ordered2(config: DotGeneratorConfig): Dot[] {
        const rng = new XoRng(config.seed);
        const dots: Dot[] = [];

        for (let row = -2; row <= 2; row += 2) {
            for (let col = 1; col <= 9; col += 2) {
                dots.push({
                    x: col,
                    y: row,
                    z: col - 5,
                    r: 0.4,
                    colour: { r: 0, g: 0, b: 0, a: 0 },
                });
            }
        }

        const colours = this.randomSaturatedColour(dots.length, rng);
        dots.forEach((dot, index) => dot.colour = colours[index]);

        return dots;
    }

    private randomWalk(config: DotGeneratorConfig): Dot[] {
        const rng = new XoRng(config.seed);
        const dots: Dot[] = [];
        const mapper = ColourMapper.fromColours(colourDistributionEven(5, 0.5, 1, 0.3, 0.5, rng), Easing.LCH_LINEAR);
        const r = 0.4;
        const d = 0.9;
        let cnt = 0;

        let currentX = 5;
        let currentY = 0;
        let currentZ = 0;

        while (cnt < config.count) {
            dots.push({
                x: currentX,
                y: currentY,
                z: currentZ,
                r: r,
                colour: this.rgbToRgba(mapper.mapClamped(rng.next()), rng),
            });

            const direction = rng.nextIntInRange(0, 5);
            switch (direction) {
                case 0: currentX -= d; break;
                case 1: currentX += d; break;
                case 2: currentY -= d; break;
                case 3: currentY += d; break;
                case 4: currentZ -= d; break;
                default: currentZ += d; break;
            }
            cnt++;
        }

        return dots;
    }

    private randomSaturatedColour(count: number, rng: XoRng): RGBA[] {
        const colours = colourDistributionEven(count, 0, 1, 0.25, 0.5, rng);
        return colours.map(colour => this.rgbToRgba(colour, rng));
    }

    private rgbToRgba(colour: RGB, rng: XoRng): RGBA {
        return {
            r: colour.r,
            g: colour.g,
            b: colour.b,
            a: rng.nextIntInRange(128, 255),
        };
    }
}