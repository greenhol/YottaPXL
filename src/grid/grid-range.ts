import { BigDecimal } from '../types';

const GRID_RANGE_SEPARATOR: string = '_';

export interface GridRange {
    xMin: BigDecimal;
    xMax: BigDecimal;
    yCenter: BigDecimal;
}

export interface GridRangeSerialized {
    xMin: string,
    xMax: string,
    yCenter: string;
}

export function createDefaultGridRange(): GridRange {
    return { xMin: BigDecimal.ZERO, xMax: BigDecimal.ONE, yCenter: BigDecimal.ZERO };
}

export function rangeXdiff(range: GridRange): BigDecimal {
    return range.xMax.sub(range.xMin);
}

export function gridRangeToString(range: GridRange): string {
    return `${range.xMin}_${range.xMax}${GRID_RANGE_SEPARATOR}${range.yCenter}`;
}

export function gridRangeFromString(range: string): GridRange | null {
    const parts: string[] = range.split(GRID_RANGE_SEPARATOR);
    if (parts.length != 3) {
        console.warn(`#gridRangeFromString - invalid input (parts.length != 3) instead ${parts.length}`, range);
        return null;
    }
    const xMin = BigDecimal.fromString(parts[0]);
    const xMax = BigDecimal.fromString(parts[1]);
    const yCenter = BigDecimal.fromString(parts[2]);
    if (xMin.gte(xMax)) {
        console.warn(`#gridRangeFromString - invalid input (xMin >= xMax) instead xMin=${xMin}, xMax=${xMax}`, range);
        return null;
    }

    return { xMin, xMax, yCenter };
}

/**
 * Convenience constructor — build a GridRange from plain strings.
 * This is the natural entry point for copy-pasted high-precision coordinates
 * as well as for hardcoded initial values in source code.
 */
export function gridRangeFromStrings(xMin: string, xMax: string, yCenter: string): GridRange {
    return {
        xMin: BigDecimal.fromString(xMin),
        xMax: BigDecimal.fromString(xMax),
        yCenter: BigDecimal.fromString(yCenter),
    };
}

/**
 * Convenience constructor — build a GridRange from plain JS numbers.
 * Use this when constructing a range from existing number values such as
 * zoom calculations or pan offsets computed at normal precision.
 */
export function gridRangeFromNumbers(xMin: number, xMax: number, yCenter: number): GridRange {
    return {
        xMin: BigDecimal.fromNumber(xMin),
        xMax: BigDecimal.fromNumber(xMax),
        yCenter: BigDecimal.fromNumber(yCenter),
    };
}

/**
 * Serialise a GridRange to a plain JSON-compatible object for localStorage.
 * The BigDecimal values are stored as strings to preserve full precision.
 */
export function gridRangeToJson(range: GridRange): { xMin: string; xMax: string; yCenter: string; } {
    return {
        xMin: range.xMin.toString(),
        xMax: range.xMax.toString(),
        yCenter: range.yCenter.toString(),
    };
}

/**
 * Deserialise a GridRange from a plain JSON-compatible object from localStorage.
 */
export function gridRangeFromJson(json: GridRangeSerialized): GridRange {
    return gridRangeFromStrings(json.xMin, json.xMax, json.yCenter);
}