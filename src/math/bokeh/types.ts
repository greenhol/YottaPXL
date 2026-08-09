export enum BokehType {
    SOFT_DISC = 'Soft Disc',
    FLAT_DISC = 'Flat Disc',
    POLYGON = 'Polygon',
    RING = 'Ring',
    BRIGHT_RIM = 'Bright Rim',
}

export interface BokehConfig {
    type: BokehType;

    // General
    maxBlurRadius: number;       // >= 0
    pixelsPerZUnit: number;      // >= 0
    focusZ: number;
    focusRange: number;          // >= 0
    edgeSoftnessPx: number;      // >= 0, used by all types — width of the AA transition band

    // Polygon only
    bladeCount: number;          // 3–12
    apertureRotation: number;    // 0-360 in degrees

    // Ring only
    innerRadiusRatio: number;    // 0–1, inner radius as fraction of outer radius

    // Bright rim
    rimIntensity: number;        // 1-10, how much brighter the edge is vs. center
}