import { converter } from './colour-converter';
import { Colour, RGB } from './colour';

export interface SupportPoint {
    pos: number;
    colour: RGB;
}

export enum Easing {
    NONE = 'None',
    RGB_LINEAR = 'RGB Linear',
    RGB_BALANCED = 'RGB Balanced',
    RGB_QUADRATIC = 'RGB Quadratic',
    HSL_LINEAR = 'HSL Linear',
    HSL_BALANCED = 'HSL Balanced',
    HSL_QUADRATIC = 'HSL Quadratic',
    LAB_LINEAR = 'Lab Linear',
    LAB_BALANCED = 'Lab Balanced',
    LAB_QUADRATIC = 'Lab Quadratic',
    LCH_LINEAR = 'Lch Linear',
    LCH_BALANCED = 'Lch Balanced',
    LCH_QUADRATIC = 'Lch Quadratic',
}

export interface ColourMapperConfig {
    supportPoints: string,
    easing: Easing,
    scaling: number,
}

export class ColourMapper {
    private _supportPoints: SupportPoint[];
    private _colourCalculator: (t: number, left: SupportPoint, right: SupportPoint) => RGB;
    private _getInterpolationFactor: (x: number, left: SupportPoint, right: SupportPoint) => number;

    public static fromString(input: string, easing: Easing = Easing.RGB_LINEAR): ColourMapper {
        return new ColourMapper(ColourMapper.parseSupportPoints(input), easing);
    }

    public static fromColours(colours: RGB[], easing: Easing = Easing.RGB_LINEAR): ColourMapper {
        const points: SupportPoint[] = colours.map((colour, index) => {
            return { pos: index / colours.length, colour: colour };
        });
        points.push({ pos: 1, colour: colours[0] });
        return new ColourMapper(points, easing);
    }

    private static parseSupportPoints(inputString: string): SupportPoint[] {
        const errorFallback: SupportPoint[] = [{ pos: 0, colour: Colour.RED }, { pos: 1, colour: Colour.DARKRED }];
        try {
            const pairs = [...inputString.matchAll(/([0-9.]+)\s*:\s*(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})\b/g)];

            if (pairs.length < 2) {
                console.error('#parseSupportPoints - Not enough valid support points found.');
                return errorFallback;
            }

            return pairs.map(([, xStr, colourStr]) => {
                const pos = parseFloat(xStr);
                if (isNaN(pos) || pos < 0 || pos > 1) {
                    console.error(`#parseSupportPoints - Invalid pos value: "${xStr}". Must be a number between 0 and 1.`);
                }
                return { pos, colour: Colour.stringToRgb(colourStr) };
            });

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

        switch (easing) {
            case Easing.NONE: this._colourCalculator = this.nearestColour; break;
            case Easing.RGB_LINEAR:
            case Easing.RGB_BALANCED:
            case Easing.RGB_QUADRATIC: this._colourCalculator = this.interpolateColourRGB; break;
            case Easing.HSL_LINEAR:
            case Easing.HSL_BALANCED:
            case Easing.HSL_QUADRATIC: this._colourCalculator = this.interpolateColourHSL; break;
            case Easing.LAB_LINEAR:
            case Easing.LAB_BALANCED:
            case Easing.LAB_QUADRATIC: this._colourCalculator = this.interpolateColourLab; break;
            case Easing.LCH_LINEAR:
            case Easing.LCH_BALANCED:
            case Easing.LCH_QUADRATIC: this._colourCalculator = this.interpolateColourLch; break;
        }

        switch (easing) {
            case Easing.NONE: this._getInterpolationFactor = this.getInterpolationFactorNone; break;
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

    public get colours(): RGB[] {
        return this._supportPoints.map(point => point.colour);
    }

    public mapLooped(x: number, scaling: number = 1, offset: number = 0): RGB {
        const loopedX = this.getLoopingX(x / scaling - offset);
        return this.mapInternal(loopedX);
    }

    public mapClamped(x: number, scaling: number = 1, offset: number = 0): RGB {
        const transformedX = x / scaling - offset;
        const firstPos = this._supportPoints[0].pos;
        const lastPos = this._supportPoints[this._supportPoints.length - 1].pos;

        if (transformedX <= firstPos) return this._supportPoints[0].colour;
        if (transformedX >= lastPos) return this._supportPoints[this._supportPoints.length - 1].colour;
        return this.mapInternal(transformedX);
    }

    public get supportPointsString(): string {
        return this._supportPoints
            .map(point => `${point.pos}:${this.rgbToHex(point.colour)}`)
            .join(', ');
    }

    private mapInternal(x: number): RGB {
        let left: SupportPoint | undefined;
        let right: SupportPoint | undefined;

        for (let i = 0; i < this._supportPoints.length - 1; i++) {
            if (x >= this._supportPoints[i].pos && x <= this._supportPoints[i + 1].pos) {
                left = this._supportPoints[i];
                right = this._supportPoints[i + 1];
                break;
            }
        }

        if (!left || !right) {
            throw new Error('Could not find a valid range for interpolation.');
        }

        return this._colourCalculator(x, left, right);
    }

    private rgbToHex(colour: RGB): string {
        return `#${[colour.r, colour.g, colour.b]
            .map(x => x.toString(16).padStart(2, '0'))
            .join('')}`;
    }

    private getLoopingX(x: number): number {
        const maxX = this._supportPoints[this._supportPoints.length - 1].pos;
        const range = maxX;
        return ((x % range) + range) % range;
    }

    private lerpAngle(start: number, end: number, t: number): number {
        const delta = (end - start + 360) % 360;
        const shortestDelta = delta <= 180 ? delta : delta - 360;
        return (start + shortestDelta * t + 360) % 360;
    }

    private nearestColour(t: number, left: SupportPoint, right: SupportPoint): RGB {
        return (this._getInterpolationFactor(t, left, right) == 0) ?
            { r: left.colour.r, g: left.colour.g, b: left.colour.b } :
            { r: right.colour.r, g: right.colour.g, b: right.colour.b };
    }

    private interpolateColourRGB(t: number, left: SupportPoint, right: SupportPoint): RGB {
        const easedT = this._getInterpolationFactor(t, left, right);
        const r = Math.round(left.colour.r + (right.colour.r - left.colour.r) * easedT);
        const g = Math.round(left.colour.g + (right.colour.g - left.colour.g) * easedT);
        const b = Math.round(left.colour.b + (right.colour.b - left.colour.b) * easedT);
        return { r, g, b };
    }

    private interpolateColourHSL(t: number, left: SupportPoint, right: SupportPoint): RGB {
        const easedT = this._getInterpolationFactor(t, left, right);
        const leftHSL = converter.rgbToHsl(left.colour);
        const rightHSL = converter.rgbToHsl(right.colour);
        const h = this.lerpAngle(leftHSL.h, rightHSL.h, easedT);
        const s = leftHSL.s + (rightHSL.s - leftHSL.s) * easedT;
        const l = leftHSL.l + (rightHSL.l - leftHSL.l) * easedT;
        return converter.hslToRgb({ h, s, l });
    }

    private interpolateColourLab(t: number, left: SupportPoint, right: SupportPoint): RGB {
        const easedT = this._getInterpolationFactor(t, left, right);
        const leftLAB = converter.rgbToOkLab(left.colour);
        const rightLAB = converter.rgbToOkLab(right.colour);
        const L = leftLAB.L + (rightLAB.L - leftLAB.L) * easedT;
        const a = leftLAB.a + (rightLAB.a - leftLAB.a) * easedT;
        const b = leftLAB.b + (rightLAB.b - leftLAB.b) * easedT;
        return converter.okLabToRgb({ L, a, b });
    }

    private interpolateColourLch(t: number, left: SupportPoint, right: SupportPoint): RGB {
        const easedT = this._getInterpolationFactor(t, left, right);
        const leftLch = converter.rgbToOkLch(left.colour);
        const rightLch = converter.rgbToOkLch(right.colour);
        const L = leftLch.L + (rightLch.L - leftLch.L) * easedT;
        const c = leftLch.c + (rightLch.c - leftLch.c) * easedT;
        const h = this.lerpAngle(leftLch.h, rightLch.h, easedT);
        return converter.okLchToRgb({ L, c, h });
    }

    private getInterpolationFactorNone(x: number, left: SupportPoint, right: SupportPoint): number {
        return Math.round(this.getInterpolationFactorLinear(x, left, right));
    }

    private getInterpolationFactorLinear(x: number, left: SupportPoint, right: SupportPoint): number {
        return (x - left.pos) / (right.pos - left.pos);
    }

    private getInterpolationFactorBalanced(x: number, left: SupportPoint, right: SupportPoint): number {
        const normalizedX = this.getInterpolationFactorLinear(x, left, right);
        const linearT = normalizedX;
        const smoothstepT = normalizedX * normalizedX * (3 - 2 * normalizedX);
        return (0.5) * linearT + 0.5 * smoothstepT;
    }

    private getInterpolationFactorQuadratic(x: number, left: SupportPoint, right: SupportPoint): number {
        const normalizedX = this.getInterpolationFactorLinear(x, left, right);
        return normalizedX * normalizedX * (3 - 2 * normalizedX);
    }
}
