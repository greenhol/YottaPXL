import { COLOR, Color } from '../../types/color';

interface SupportPoint {
    pos: number;
    color: Color;
}

export class ColorMapper {
    private _supportPoints: SupportPoint[];
    private _easingFactor: number;

    public static fromString(input: string, easingFactor: number = 0): ColorMapper {
        return new ColorMapper(ColorMapper.parseSupportPoints(input), easingFactor);
    }

    public static fromColors(colors: Color[], easingFactor: number = 0): ColorMapper {
        const points: SupportPoint[] = colors.map((color, index) => {
            return { pos: index / colors.length, color: color };
        });
        points.push({ pos: 1, color: colors[0] });
        return new ColorMapper(points, easingFactor);
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

    constructor(supportPoints: SupportPoint[], easingFactor: number = 0) {
        if (supportPoints.length < 2) {
            throw new Error('At least two support points are required.');
        }
        this._supportPoints = structuredClone(supportPoints.sort((a, b) => a.pos - b.pos));
        if (this._supportPoints[0].pos !== 0) {
            console.warn('#ctor - The first support point is always 0');
            supportPoints[0].pos = 0;
        }
        this._easingFactor = easingFactor;
    }

    public map(x: number, scale: number = 1): Color {
        const loopedX = this.getLoopingX(x / scale);
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

        return this.interpolateColor(
            this.getInterpolationFactor(loopedX, left, right, this._easingFactor),
            left,
            right,
        );
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

    private getInterpolationFactor(x: number, left: SupportPoint, right: SupportPoint, easingFactor: number): number {
        const normalizedX = (x - left.pos) / (right.pos - left.pos);
        const linearT = normalizedX;
        const smoothstepT = normalizedX * normalizedX * (3 - 2 * normalizedX);
        return (1 - easingFactor) * linearT + easingFactor * smoothstepT;
    }

    private interpolateColor(t: number, left: SupportPoint, right: SupportPoint): Color {
        const r = Math.round(left.color.r + (right.color.r - left.color.r) * t);
        const g = Math.round(left.color.g + (right.color.g - left.color.g) * t);
        const b = Math.round(left.color.b + (right.color.b - left.color.b) * t);
        return { r, g, b };
    }
}
