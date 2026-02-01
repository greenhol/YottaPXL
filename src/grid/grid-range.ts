const GRID_RANGE_SEPARATOR: string = '_';

export interface GridRange {
    xMin: number;
    xMax: number;
    yCenter: number;
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
    const xMin = parseFloat(parts[0]);
    const xMax = parseFloat(parts[1]);
    const yCenter = parseFloat(parts[2]);
    if (xMin >= xMax) {
        console.warn(`#gridRangeFromString - invalid input (xMin >= xMax) instead xMin=${xMin}, xMax=${xMax}`, range);
        return null;
    }

    return { xMin, xMax, yCenter }
}
