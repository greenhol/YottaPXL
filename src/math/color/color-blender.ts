import { RGB } from '../../types';
import { converter } from './color-converter';

export enum BlendingType {
    INTENSITY = 'Intensity Manipulation',
    HSL_HUE = 'HSL Hue Manipulation',
    HSL_SATURATION = 'HSL Saturation Manipulation',
    HSL_LIGHTNESS = 'HSL Lightness Manipulation',
    HSL_ALL = 'HSL Blending',
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

class ColorBlender {

    public blend(color1: RGB, color2: RGB, type: BlendingType): RGB {
        switch (type) {
            case BlendingType.INTENSITY: return this.intensityBlending(color1, color2);
            case BlendingType.HSL_HUE: return this.hueBlending(color1, color2);
            case BlendingType.HSL_SATURATION: return this.saturationBlending(color1, color2);
            case BlendingType.HSL_LIGHTNESS: return this.lightnessBlending(color1, color2);
            case BlendingType.HSL_ALL: return this.hslBlending(color1, color2);
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

    private intensityBlending(color1: RGB, color2: RGB): RGB {
        const factor = converter.getBritghtness(color2);
        return {
            r: Math.round(factor * color1.r),
            g: Math.round(factor * color1.g),
            b: Math.round(factor * color1.b),
        };
    }

    private hueBlending(color1: RGB, color2: RGB): RGB {
        const factor = converter.getBritghtness(color2);
        const { h, s, l } = converter.rgbToHsl(color1);
        const newH = Math.max(0, Math.min(1, h * factor)); // Clamp to [0, 1]
        return converter.hslToRgb({ h: newH, s: s, l: l });
    }

    private saturationBlending(color1: RGB, color2: RGB): RGB {
        const factor = converter.getBritghtness(color2);
        const { h, s, l } = converter.rgbToHsl(color1);
        const newS = Math.max(0, Math.min(1, s * factor)); // Clamp to [0, 1]
        return converter.hslToRgb({ h: h, s: newS, l: l });
    }

    private lightnessBlending(color1: RGB, color2: RGB): RGB {
        const factor = converter.getBritghtness(color2);
        const { h, s, l } = converter.rgbToHsl(color1);
        const newL = Math.max(0, Math.min(1, l * factor)); // Clamp to [0, 1]
        return converter.hslToRgb({ h: h, s: s, l: newL });
    }

    private hslBlending(color1: RGB, color2: RGB): RGB {
        const factorH = color2.r / 255;
        const factorS = color2.g / 255;
        const factorL = color2.b / 255;
        const { h, s, l } = converter.rgbToHsl(color1);
        const newH = Math.max(0, Math.min(1, h * factorH));
        const newS = Math.max(0, Math.min(1, s * factorS));
        const newL = Math.max(0, Math.min(1, l * factorL));
        return converter.hslToRgb({ h: newH, s: newS, l: newL });
    }

    private cielabBlendingL(color1: RGB, color2: RGB): RGB {
        const factor = converter.getBritghtness(color2);
        const cielab = converter.rgbToLab(color1);
        cielab.L = Math.max(0, Math.min(100, cielab.L * factor));
        return converter.labToRgb(cielab);
    }

    private cielabBlendingA(color1: RGB, color2: RGB): RGB {
        const factor = converter.getBritghtness(color2);
        const cielab = converter.rgbToLab(color1);
        cielab.a = Math.max(-128, Math.min(127, cielab.a * factor));
        return converter.labToRgb(cielab);
    }

    private cielabBlendingB(color1: RGB, color2: RGB): RGB {
        const factor = converter.getBritghtness(color2);
        const cielab = converter.rgbToLab(color1);
        cielab.b = Math.max(-128, Math.min(127, cielab.b * factor));
        return converter.labToRgb(cielab);
    }

    private cielabBlending(color1: RGB, color2: RGB): RGB {
        const factorL = color2.r / 255;
        const factorA = color2.g / 255;
        const factorB = color2.b / 255;
        const cielab = converter.rgbToLab(color1);
        cielab.L = Math.max(0, Math.min(100, cielab.L * factorL));
        cielab.a = Math.max(-128, Math.min(127, cielab.a * factorA));
        cielab.b = Math.max(-128, Math.min(127, cielab.b * factorB));
        return converter.labToRgb(cielab);
    }

    private alphaBlending(color1: RGB, color2: RGB, alpha1: number, alpha2: number): RGB {
        // Blend each channel (R, G, B)
        const r = Math.round((color1.r * alpha1 + color2.r * alpha2 * (1 - alpha1 / 255)) / (alpha1 + alpha2 * (1 - alpha1 / 255)));
        const g = Math.round((color1.g * alpha1 + color2.g * alpha2 * (1 - alpha1 / 255)) / (alpha1 + alpha2 * (1 - alpha1 / 255)));
        const b = Math.round((color1.b * alpha1 + color2.b * alpha2 * (1 - alpha1 / 255)) / (alpha1 + alpha2 * (1 - alpha1 / 255)));
        return { r, g, b };
    }

    private additiveBlending(color1: RGB, color2: RGB): RGB {
        return {
            r: Math.round((color1.r + color2.r) / 2),
            g: Math.round((color1.g + color2.g) / 2),
            b: Math.round((color1.b + color2.b) / 2)
        };
    }

    private multiplicativeBlending(color1: RGB, color2: RGB): RGB {
        return {
            r: Math.round((color1.r / 255) * (color2.r / 255) * 255),
            g: Math.round((color1.g / 255) * (color2.g / 255) * 255),
            b: Math.round((color1.b / 255) * (color2.b / 255) * 255)
        };
    }
}

export const blender = new ColorBlender();
