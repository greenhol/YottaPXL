export interface PointInPixel {
    rowDiff: number;
    colDiff: number;
    x: number;
    y: number;
    distance: number;
}

export interface LicConfig {
    minLength: number,
    maxLength: number,
    strength: number,
}
