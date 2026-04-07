import { Gradient } from './../../plane/gradient/gradient';
import { COLOR, Color } from '../../types/color';

export interface SupportPoint {
    pos: number;
    color: Color;
}

export enum Easing {
    NONE = 'None',
    LINEAR = 'Linear',
    BALANCED = 'Balanced',
    QUADRATIC = 'Quadratic',
}

export interface ColorMapperConfig {
    supportPoints: string,
    easing: Easing,
    scaling: number,
}

export class ColorMapper {
    private _supportPoints: SupportPoint[];
    private _colorCalculator: (t: number, left: SupportPoint, right: SupportPoint) => Color;
    private _getInterpolationFactor: (x: number, left: SupportPoint, right: SupportPoint) => number;

    public static fromString(input: string, easing: Easing = Easing.LINEAR): ColorMapper {
        return new ColorMapper(ColorMapper.parseSupportPoints(input), easing);
    }

    public static fromColors(colors: Color[], easing: Easing = Easing.LINEAR): ColorMapper {
        const points: SupportPoint[] = colors.map((color, index) => {
            return { pos: index / colors.length, color: color };
        });
        points.push({ pos: 1, color: colors[0] });
        return new ColorMapper(points, easing);
    }

    private static parseSupportPoints(inputString: string): SupportPoint[] {
        const errorFallback: SupportPoint[] = [{ pos: 0, color: COLOR.RED }, { pos: 1, color: COLOR.DARKRED }];
        try {
            const points: SupportPoint[] = [];
            const pairs = inputString.split(',').map(p => p.trim()).filter(p => p);

            for (const pair of pairs) {
                const [xStr, color] = pair.split(':').map(s => s.trim());
                if (xStr === undefined || color === undefined) {
                    console.error(`#parseSupportPoints - Invalid pair format: "${pair}". Expected "x:color".`);
                    return errorFallback;
                }

                const x = parseFloat(xStr);
                if (isNaN(x)) {
                    console.error(`#parseSupportPoints - Invalid x value: "${xStr}". Must be a number.`);
                    return errorFallback;
                }

                if (!/^#[0-9A-F]{6}$/i.test(color)) {
                    console.error(`#parseSupportPoints - Invalid color format: "${color}". Expected "#RRGGBB".`);
                    return errorFallback;
                }

                const r = parseInt(color.slice(1, 3), 16);
                const g = parseInt(color.slice(3, 5), 16);
                const b = parseInt(color.slice(5, 7), 16);

                points.push({ pos: x, color: { r, g, b } });
            }

            if (points.length < 2) {
                console.error('#parseSupportPoints - Not enough valid support points found.');
                return errorFallback;
            }

            return points;
        } catch (e) {
            console.error('#parseSupportPoints - Failed to parse support points:', e);
            return errorFallback;
        }
    }

    constructor(supportPoints: SupportPoint[], easing: Easing = Easing.LINEAR) {
        if (supportPoints.length < 2) {
            throw new Error('At least two support points are required.');
        }
        this._supportPoints = structuredClone(supportPoints.sort((a, b) => a.pos - b.pos));
        if (this._supportPoints[0].pos !== 0) {
            console.warn('#ctor - The first support point is always 0');
            supportPoints[0].pos = 0;
        }
        this._colorCalculator = (easing == Easing.NONE) ?
            this.leftColor :
            this.interpolateColor;

        switch (easing) {
            case Easing.NONE: this._getInterpolationFactor = this.getInterpolationFactorNone; break; // Never used
            case Easing.LINEAR: this._getInterpolationFactor = this.getInterpolationFactorLinear; break;
            case Easing.BALANCED: this._getInterpolationFactor = this.getInterpolationFactorBalanced; break;
            case Easing.QUADRATIC: this._getInterpolationFactor = this.getInterpolationFactorQuadratic; break;
        }
    }

    public map(x: number, scaling: number = 1, offset: number = 0): Color {
        const loopedX = this.getLoopingX(x / scaling - offset);
        let left: SupportPoint | undefined;
        let right: SupportPoint | undefined;

        for (let i = 0; i < this._supportPoints.length - 1; i++) {
            if (loopedX >= this._supportPoints[i].pos && loopedX <= this._supportPoints[i + 1].pos) {
                left = this._supportPoints[i];
                right = this._supportPoints[i + 1];
                break;
            }
        }

        if (!left || !right) {
            throw new Error('Could not find a valid range for interpolation.');
        }

        return this._colorCalculator(loopedX, left, right);
    }

    public get supportPointsString(): string {
        return this._supportPoints
            .map(point => `${point.pos}:${this.rgbToHex(point.color)}`)
            .join(', ');
    }

    private rgbToHex(color: Color): string {
        return `#${[color.r, color.g, color.b]
            .map(x => x.toString(16).padStart(2, '0'))
            .join('')}`;
    }

    private getLoopingX(x: number): number {
        const maxX = this._supportPoints[this._supportPoints.length - 1].pos;
        const range = maxX;
        return ((x % range) + range) % range;
    }

    private leftColor(t: number, left: SupportPoint, right: SupportPoint): Color {
        return { r: left.color.r, g: left.color.g, b: left.color.b };
    }

    private interpolateColor(t: number, left: SupportPoint, right: SupportPoint): Color {
        const easedT = this._getInterpolationFactor(t, left, right);
        const r = Math.round(left.color.r + (right.color.r - left.color.r) * easedT);
        const g = Math.round(left.color.g + (right.color.g - left.color.g) * easedT);
        const b = Math.round(left.color.b + (right.color.b - left.color.b) * easedT);
        return { r, g, b };
    }

    private getInterpolationFactorNone(x: number, left: SupportPoint, right: SupportPoint): number {
        return 0; // Never used
    }

    private getInterpolationFactorLinear(x: number, left: SupportPoint, right: SupportPoint): number {
        return (x - left.pos) / (right.pos - left.pos);
    }

    private getInterpolationFactorBalanced(x: number, left: SupportPoint, right: SupportPoint): number {
        const normalizedX = (x - left.pos) / (right.pos - left.pos);
        const linearT = normalizedX;
        const smoothstepT = normalizedX * normalizedX * (3 - 2 * normalizedX);
        return (0.5) * linearT + 0.5 * smoothstepT;
    }

    private getInterpolationFactorQuadratic(x: number, left: SupportPoint, right: SupportPoint): number {
        const normalizedX = (x - left.pos) / (right.pos - left.pos);
        return normalizedX * normalizedX * (3 - 2 * normalizedX);
    }
}
