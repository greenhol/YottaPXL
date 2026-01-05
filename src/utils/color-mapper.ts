export interface RGB {
    r: number;
    g: number;
    b: number;
}

export interface ColorSegment {
    color: RGB;
    cycleLength: number;
}

export const BLACK: RGB = { r: 0, g: 0, b: 0 };
export const WHITE: RGB = { r: 255, g: 255, b: 255 };

export class ColorMapper {
    private _colorSegments: ColorSegment[];
    private _totalCycleLength: number;
    private _fallBackColor: RGB;

    constructor(segments: ColorSegment[], fallBackColor: RGB = BLACK) {
        if (segments.length < 2) {
            throw new Error("At least two color segments are required.");
        }
        if (segments.some(color => color.cycleLength <= 0)) {
            throw new Error("Each color's cycle length must be a positive number.");
        }

        this._colorSegments = segments;
        this._totalCycleLength = segments.reduce((sum, segment) => sum + segment.cycleLength, 0);
        this._fallBackColor = fallBackColor;
    }

    public map(value: number): RGB {
        if (value < 0) {
            return this._fallBackColor;
        }

        const roundedValue = Math.round(value);
        const cyclePosition = roundedValue % this._totalCycleLength;
        let accumulatedLength = 0;

        for (let i = 0; i < this._colorSegments.length; i++) {
            const segment = this._colorSegments[i];
            const nextColorSegment = this._colorSegments[(i + 1) % this._colorSegments.length];
            const segmentLength = segment.cycleLength;
            const segmentStart = accumulatedLength;
            const segmentEnd = accumulatedLength + segmentLength;

            if (cyclePosition >= segmentStart && cyclePosition < segmentEnd) {
                const segmentPos = (cyclePosition - segmentStart) / segmentLength;

                // Linear interpolation
                const r = Math.round(segment.color.r + segmentPos * (nextColorSegment.color.r - segment.color.r));
                const g = Math.round(segment.color.g + segmentPos * (nextColorSegment.color.g - segment.color.g));
                const b = Math.round(segment.color.b + segmentPos * (nextColorSegment.color.b - segment.color.b));

                return { r, g, b };
            }

            accumulatedLength += segmentLength;
        }

        return this._fallBackColor;
    }
}