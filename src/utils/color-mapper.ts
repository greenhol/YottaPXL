import { BLACK, Color } from './color';

export interface ColorSegment {
    color: Color;
    cycleLength: number;
}

export class ColorMapper {
    private _colorSegments: ColorSegment[];
    private _totalCycleLength: number;
    private _fallBackColor: Color;

    constructor(segments: ColorSegment[], fallBackColor: Color = BLACK) {
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

    public map(value: number): Color {
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