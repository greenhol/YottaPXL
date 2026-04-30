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

export namespace GridRange {

    export function createDefaultGridRange(): GridRange {
        return { xMin: BigDecimal.ZERO, xMax: BigDecimal.ONE, yCenter: BigDecimal.ZERO };
    }

    export function rangeXdiff(range: GridRange): BigDecimal {
        return range.xMax.sub(range.xMin);
    }

    export function toString(range: GridRange): string {
        return `${range.xMin}${GRID_RANGE_SEPARATOR}${range.xMax}${GRID_RANGE_SEPARATOR}${range.yCenter}`;
    }

    export function fromString(range: string): GridRange | null {
        const parts: string[] = range.split(GRID_RANGE_SEPARATOR);
        if (parts.length != 3) {
            console.warn(`#GridRange.fromString - invalid input (parts.length != 3) instead ${parts.length}`, range);
            return null;
        }
        const xMin = BigDecimal.fromString(parts[0]);
        const xMax = BigDecimal.fromString(parts[1]);
        const yCenter = BigDecimal.fromString(parts[2]);
        if (xMin.gte(xMax)) {
            console.warn(`#GridRange.fromString - invalid input (xMin >= xMax) instead xMin=${xMin}, xMax=${xMax}`, range);
            return null;
        }

        return { xMin, xMax, yCenter };
    }

    export function serialize(range: GridRange): GridRangeSerialized {
        return {
            xMin: range.xMin.toString(),
            xMax: range.xMax.toString(),
            yCenter: range.yCenter.toString(),
        };
    }
}

export namespace GridRangeSerialized {

    export function deserialize(range: GridRangeSerialized): GridRange {
        return {
            xMin: BigDecimal.fromString(range.xMin),
            xMax: BigDecimal.fromString(range.xMax),
            yCenter: BigDecimal.fromString(range.yCenter),
        };
    }
}
