import { Color } from '../../types';

export enum BlendingType {
    INTENSITY = 'Intensity Manipulation',
    HSL_HUE = 'HSL Hue Manipulation',
    HSL_SATURATION = 'HSL Saturation Manipulation',
    HSL_LIGHTNESS = 'HSL Lightness Manipulation',
    CIELAB_L = 'CIELAB Lightness Manipulation',
    CIELAB_A = 'CIELAB a Manipulation',
    CIELAB_B = 'CIELAB b Manipulation',
    CIELAB_LAB = 'CIELAB Lab Blending',
    ALPHA_75_25 = 'Alpha Blending 75:25',
    ALPHA_50_50 = 'Alpha Blending 50:50',
    ALPHA_25_75 = 'Alpha Blending 25:75',
    ADDITIVE = 'Additive Blending',
    MULTIPLICATIVE = 'Multiplicative Blending',
}

interface HSL {
    h: number,
    s: number,
    l: number,
}

interface XYZ {
    x: number,
    y: number,
    z: number,
}

interface LAB {
    L: number,
    a: number,
    b: number,
}

const refWhiteD65 = {
    x: 95.047,
    y: 100.000,
    z: 108.883,
};

class ColorBlender {

    public blend(color1: Color, color2: Color, type: BlendingType): Color {
        switch (type) {
            case BlendingType.INTENSITY: return this.intensityBlending(color1, color2);
            case BlendingType.HSL_HUE: return this.hueBlending(color1, color2);
            case BlendingType.HSL_SATURATION: return this.saturationBlending(color1, color2);
            case BlendingType.HSL_LIGHTNESS: return this.lightnessBlending(color1, color2);
            case BlendingType.CIELAB_L: return this.cielabBlendingL(color1, color2);
            case BlendingType.CIELAB_A: return this.cielabBlendingA(color1, color2);
            case BlendingType.CIELAB_B: return this.cielabBlendingB(color1, color2);
            case BlendingType.CIELAB_LAB: return this.cielabBlending(color1, color2);
            case BlendingType.ALPHA_75_25: return this.alphaBlending(color1, color2, 191, 63);
            case BlendingType.ALPHA_50_50: return this.alphaBlending(color1, color2, 127, 127);
            case BlendingType.ALPHA_25_75: return this.alphaBlending(color1, color2, 63, 191);
            case BlendingType.ADDITIVE: return this.additiveBlending(color1, color2);
            case BlendingType.MULTIPLICATIVE: return this.multiplicativeBlending(color1, color2);
        }
    }

    private intensityBlending(color1: Color, color2: Color): Color {
        const factor = this.getBritghtness(color2);
        return {
            r: Math.round(factor * color1.r),
            g: Math.round(factor * color1.g),
            b: Math.round(factor * color1.b),
        };
    }

    private hueBlending(color1: Color, color2: Color): Color {
        const factor = this.getBritghtness(color2);
        const { h, s, l } = this.rgbToHsl(color1);
        const newH = Math.max(0, Math.min(1, h * factor)); // Clamp to [0, 1]
        return this.hslToRgb({ h: newH, s: s, l: l });
    }

    private saturationBlending(color1: Color, color2: Color): Color {
        const factor = this.getBritghtness(color2);
        const { h, s, l } = this.rgbToHsl(color1);
        const newS = Math.max(0, Math.min(1, s * factor)); // Clamp to [0, 1]
        return this.hslToRgb({ h: h, s: newS, l: l });
    }

    private lightnessBlending(color1: Color, color2: Color): Color {
        const factor = this.getBritghtness(color2);
        const { h, s, l } = this.rgbToHsl(color1);
        const newL = Math.max(0, Math.min(1, l * factor)); // Clamp to [0, 1]
        return this.hslToRgb({ h: h, s: s, l: newL });
    }

    private cielabBlendingL(color1: Color, color2: Color): Color {
        const factor = this.getBritghtness(color2);
        const cielab = this.xyzToLab(this.rgbToXyz(color1));
        cielab.L = Math.max(0, Math.min(100, cielab.L * factor));
        return this.xyzToRgb(this.labToXyz(cielab));
    }

    private cielabBlendingA(color1: Color, color2: Color): Color {
        const factor = this.getBritghtness(color2);
        const cielab = this.xyzToLab(this.rgbToXyz(color1));
        cielab.a = Math.max(-128, Math.min(127, cielab.a * factor));
        return this.xyzToRgb(this.labToXyz(cielab));
    }

    private cielabBlendingB(color1: Color, color2: Color): Color {
        const factor = this.getBritghtness(color2);
        const cielab = this.xyzToLab(this.rgbToXyz(color1));
        cielab.b = Math.max(-128, Math.min(127, cielab.b * factor));
        return this.xyzToRgb(this.labToXyz(cielab));
    }

    private cielabBlending(color1: Color, color2: Color): Color {
        const factorL = color2.r / 255;
        const factorA = color2.g / 255;
        const factorB = color2.b / 255;
        const cielab = this.xyzToLab(this.rgbToXyz(color1));
        cielab.L = Math.max(0, Math.min(100, cielab.L * factorL));
        cielab.a = Math.max(-128, Math.min(127, cielab.a * factorA));
        cielab.b = Math.max(-128, Math.min(127, cielab.b * factorB));
        return this.xyzToRgb(this.labToXyz(cielab));
    }

    private alphaBlending(color1: Color, color2: Color, alpha1: number, alpha2: number): Color {
        // Blend each channel (R, G, B)
        const r = Math.round((color1.r * alpha1 + color2.r * alpha2 * (1 - alpha1 / 255)) / (alpha1 + alpha2 * (1 - alpha1 / 255)));
        const g = Math.round((color1.g * alpha1 + color2.g * alpha2 * (1 - alpha1 / 255)) / (alpha1 + alpha2 * (1 - alpha1 / 255)));
        const b = Math.round((color1.b * alpha1 + color2.b * alpha2 * (1 - alpha1 / 255)) / (alpha1 + alpha2 * (1 - alpha1 / 255)));
        return { r, g, b };
    }

    private additiveBlending(color1: Color, color2: Color): Color {
        return {
            r: Math.round((color1.r + color2.r) / 2),
            g: Math.round((color1.g + color2.g) / 2),
            b: Math.round((color1.b + color2.b) / 2)
        };
    }

    private multiplicativeBlending(color1: Color, color2: Color): Color {
        return {
            r: Math.round((color1.r / 255) * (color2.r / 255) * 255),
            g: Math.round((color1.g / 255) * (color2.g / 255) * 255),
            b: Math.round((color1.b / 255) * (color2.b / 255) * 255)
        };
    }

    /**
     *  Helper Functions
     */

    private getBritghtness(color: Color): number {
        return (color.r + color.g + color.b) / 765;
    }

    private rgbToHsl(rgbColor: Color): HSL {
        const [r, g, b] = [rgbColor.r /= 255, rgbColor.g /= 255, rgbColor.b /= 255];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let [h, s, l] = [0, 0, (max + min) / 2];

        if (max === min) {
            h = s = 0; // achromatic
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return { h, s, l };
    }

    private hslToRgb(hslColor: HSL): Color {
        const [h, s, l] = [hslColor.h, hslColor.s, hslColor.l];
        let r, g, b;

        if (hslColor.s === 0) {
            r = g = b = hslColor.l; // achromatic
        } else {
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = this.hueToRgb(p, q, h + 1 / 3);
            g = this.hueToRgb(p, q, h);
            b = this.hueToRgb(p, q, h - 1 / 3);
        }

        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }

    private rgbToXyz(color: Color): XYZ {
        let [sr, sg, sb] = [color.r / 255, color.g / 255, color.b / 255];

        // Apply gamma correction
        sr = sr > 0.04045 ? Math.pow((sr + 0.055) / 1.055, 2.4) : sr / 12.92;
        sg = sg > 0.04045 ? Math.pow((sg + 0.055) / 1.055, 2.4) : sg / 12.92;
        sb = sb > 0.04045 ? Math.pow((sb + 0.055) / 1.055, 2.4) : sb / 12.92;

        // Convert to XYZ using D65 illuminant
        const x = sr * 0.4124564 + sg * 0.3575761 + sb * 0.1804375;
        const y = sr * 0.2126729 + sg * 0.7151522 + sb * 0.0721750;
        const z = sr * 0.0193339 + sg * 0.1191920 + sb * 0.9503041;

        return { x: x * 100, y: y * 100, z: z * 100 };
    }

    private xyzToRgb(xyz: XYZ): Color {
        // Normalize XYZ
        const [x, y, z] = [xyz.x /= 100, xyz.y /= 100, xyz.z /= 100];

        // Convert to linear RGB
        const r = x * 3.2404542 + y * -1.5371385 + z * -0.4985314;
        const g = x * -0.9692660 + y * 1.8760108 + z * 0.0415560;
        const b = x * 0.0556434 + y * -0.2040259 + z * 1.0572252;

        return {
            r: Math.round(this.linearToGamma(r) * 255),
            g: Math.round(this.linearToGamma(g) * 255),
            b: Math.round(this.linearToGamma(b) * 255),
        };
    }

    private xyzToLab(xyz: XYZ): LAB {
        const [nx, ny, nz] = [xyz.x / refWhiteD65.x, xyz.y / refWhiteD65.y, xyz.z / refWhiteD65.z];

        // Apply nonlinear transform
        const fx = nx > 0.008856 ? Math.pow(nx, 1 / 3) : (7.787 * nx) + (16 / 116);
        const fy = ny > 0.008856 ? Math.pow(ny, 1 / 3) : (7.787 * ny) + (16 / 116);
        const fz = nz > 0.008856 ? Math.pow(nz, 1 / 3) : (7.787 * nz) + (16 / 116);

        // Calculate L*, a*, b*
        const L = (116 * fy) - 16;
        const a = 500 * (fx - fy);
        const b = 200 * (fy - fz);

        return { L, a, b };
    }

    private labToXyz(lab: LAB): XYZ {
        // Calculate intermediate values
        const fy = (lab.L + 16) / 116;
        const fx = fy + (lab.a / 500);
        const fz = fy - (lab.b / 200);

        // Convert to XYZ
        const x = refWhiteD65.x * (fx > 0.206897 ? Math.pow(fx, 3) : (fx - 16 / 116) / 7.787);
        const y = refWhiteD65.y * (fy > 0.206897 ? Math.pow(fy, 3) : (fy - 16 / 116) / 7.787);
        const z = refWhiteD65.z * (fz > 0.206897 ? Math.pow(fz, 3) : (fz - 16 / 116) / 7.787);

        return { x, y, z };
    }

    private hueToRgb(p: number, q: number, t: number): number {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    }

    private linearToGamma(channel: number): number {
        return channel <= 0.0031308 ? 12.92 * channel : (1 + 0.055) * Math.pow(channel, 1 / 2.4) - 0.055;
    }
}

export const blender = new ColorBlender();