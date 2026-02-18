export interface Color {
    r: number;
    g: number;
    b: number;
}

export const BLACK: Color = { r: 0, g: 0, b: 0 };
export const WHITE: Color = { r: 255, g: 255, b: 255 };
export const RED: Color = { r: 255, g: 0, b: 0 };
export const GREEN: Color = { r: 0, g: 255, b: 0 };
export const BLUE: Color = { r: 0, g: 0, b: 255 };
export const STEELBLUE: Color = { r: 70, g: 130, b: 180 };

export function createGray(intensity: number): Color {
    const value = Math.round(intensity * 255);
    return { r: value, g: value, b: value };
}