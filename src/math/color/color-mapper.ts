import { COLOR, RGB } from '../../types/color';
import { converter } from './color-converter';

export interface SupportPoint {
    pos: number;
    color: RGB;
}

export enum Easing {
    NONE = 'None',
    RGB_LINEAR = 'RGB Linear',
    RGB_BALANCED = 'RGB Balanced',
    RGB_QUADRATIC = 'RGB Quadratic',
    HSL_LINEAR = 'HSL Linear',
    HSL_BALANCED = 'HSL Balanced',
    HSL_QUADRATIC = 'HSL Quadratic',
    LAB_LINEAR = 'LAB Linear',
    LAB_BALANCED = 'LAB Balanced',
    LAB_QUADRATIC = 'LAB Quadratic',
    LCH_LINEAR = 'LCH Linear',
    LCH_BALANCED = 'LCH Balanced',
    LCH_QUADRATIC = 'LCH Quadratic',
}

export interface ColorMapperConfig {
    supportPoints: string,
    easing: Easing,
    scaling: number,
}

export class ColorMapper {
    private _supportPoints: SupportPoint[];
    private _colorCalculator: (t: number, left: SupportPoint, right: SupportPoint) => RGB;
    private _getInterpolationFactor: (x: number, left: SupportPoint, right: SupportPoint) => number;

    public static fromString(input: string, easing: Easing = Easing.RGB_LINEAR): ColorMapper {
        return new ColorMapper(ColorMapper.parseSupportPoints(input), easing);
    }

    public static fromColors(colors: RGB[], easing: Easing = Easing.RGB_LINEAR): ColorMapper {
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

    constructor(supportPoints: SupportPoint[], easing: Easing = Easing.RGB_LINEAR) {
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
            this.interpolateColorRGB;

        switch (easing) {
            case Easing.NONE: this._colorCalculator = this.leftColor; break;
            case Easing.RGB_LINEAR:
            case Easing.RGB_BALANCED:
            case Easing.RGB_QUADRATIC: this._colorCalculator = this.interpolateColorRGB; break;
            case Easing.HSL_LINEAR:
            case Easing.HSL_BALANCED:
            case Easing.HSL_QUADRATIC: this._colorCalculator = this.interpolateColorHSL; break;
            case Easing.LAB_LINEAR:
            case Easing.LAB_BALANCED:
            case Easing.LAB_QUADRATIC: this._colorCalculator = this.interpolateColorLAB; break;
            case Easing.LCH_LINEAR:
            case Easing.LCH_BALANCED:
            case Easing.LCH_QUADRATIC: this._colorCalculator = this.interpolateColorLCH; break;
        }

        switch (easing) {
            case Easing.NONE: this._getInterpolationFactor = this.getInterpolationFactorNone; break; // Never used
            case Easing.RGB_LINEAR:
            case Easing.HSL_LINEAR:
            case Easing.LAB_LINEAR:
            case Easing.LCH_LINEAR: this._getInterpolationFactor = this.getInterpolationFactorLinear; break;
            case Easing.RGB_BALANCED:
            case Easing.HSL_BALANCED:
            case Easing.LAB_BALANCED:
            case Easing.LCH_BALANCED: this._getInterpolationFactor = this.getInterpolationFactorBalanced; break;
            case Easing.RGB_QUADRATIC:
            case Easing.HSL_QUADRATIC:
            case Easing.LAB_QUADRATIC:
            case Easing.LCH_QUADRATIC: this._getInterpolationFactor = this.getInterpolationFactorQuadratic; break;
        }
    }

    public map(x: number, scaling: number = 1, offset: number = 0): RGB {
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

    private rgbToHex(color: RGB): string {
        return `#${[color.r, color.g, color.b]
            .map(x => x.toString(16).padStart(2, '0'))
            .join('')}`;
    }

    private getLoopingX(x: number): number {
        const maxX = this._supportPoints[this._supportPoints.length - 1].pos;
        const range = maxX;
        return ((x % range) + range) % range;
    }

    private leftColor(t: number, left: SupportPoint, right: SupportPoint): RGB {
        return { r: left.color.r, g: left.color.g, b: left.color.b };
    }

    private lerpAngle(start: number, end: number, t: number): number {
        const delta = (end - start + 360) % 360;
        const shortestDelta = delta <= 180 ? delta : delta - 360;
        return (start + shortestDelta * t + 360) % 360;
    }

    private interpolateColorRGB(t: number, left: SupportPoint, right: SupportPoint): RGB {
        const easedT = this._getInterpolationFactor(t, left, right);
        const r = Math.round(left.color.r + (right.color.r - left.color.r) * easedT);
        const g = Math.round(left.color.g + (right.color.g - left.color.g) * easedT);
        const b = Math.round(left.color.b + (right.color.b - left.color.b) * easedT);
        return { r, g, b };
    }

    private interpolateColorHSL(t: number, left: SupportPoint, right: SupportPoint): RGB {
        const easedT = this._getInterpolationFactor(t, left, right);
        const leftHSL = converter.rgbToHsl(left.color);
        const rightHSL = converter.rgbToHsl(right.color);
        const h = this.lerpAngle(leftHSL.h, rightHSL.h, easedT);
        const s = leftHSL.s + (rightHSL.s - leftHSL.s) * easedT;
        const l = leftHSL.l + (rightHSL.l - leftHSL.l) * easedT;
        return converter.hslToRgb({ h, s, l });
    }

    private interpolateColorLAB(t: number, left: SupportPoint, right: SupportPoint): RGB {
        const easedT = this._getInterpolationFactor(t, left, right);
        const leftLAB = converter.rgbToOklab(left.color);
        const rightLAB = converter.rgbToOklab(right.color);
        const L = leftLAB.L + (rightLAB.L - leftLAB.L) * easedT;
        const a = leftLAB.a + (rightLAB.a - leftLAB.a) * easedT;
        const b = leftLAB.b + (rightLAB.b - leftLAB.b) * easedT;
        return converter.oklabToRgb({ L, a, b });
    }

    private interpolateColorLCH(t: number, left: SupportPoint, right: SupportPoint): RGB {
        const easedT = this._getInterpolationFactor(t, left, right);
        const leftLCH = converter.rgbToOklch(left.color);
        const rightLCH = converter.rgbToOklch(right.color);
        const L = leftLCH.L + (rightLCH.L - leftLCH.L) * easedT;
        const c = leftLCH.c + (rightLCH.c - leftLCH.c) * easedT;
        const h = this.lerpAngle(leftLCH.h, rightLCH.h, easedT);
        return converter.oklchToRgb({ L, c, h });
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
