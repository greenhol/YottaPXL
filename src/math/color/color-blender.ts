import { RGB } from '../../types';
import { converter } from './color-converter';

export enum BlendingType {
    INTENSITY = 'Intensity Manipulation',
    HSL = 'HSL Manipulation',
    OKLAB = 'OKLab Manipulation',
    OKLCH = 'OKLCH Manipulation',
    ALPHA_75_25 = 'Alpha Blending 75:25',
    ALPHA_50_50 = 'Alpha Blending 50:50',
    ALPHA_25_75 = 'Alpha Blending 25:75',
    ADDITIVE = 'Additive Blending',
    MULTIPLICATIVE = 'Multiplicative Blending',
}

class ColorBlender {

    public blend(color1: RGB, color2: RGB, type: BlendingType): RGB {
        switch (type) {
            case BlendingType.INTENSITY: return this.intensityManipulation(color1, color2);
            case BlendingType.HSL: return this.hslManipulation(color1, color2);
            case BlendingType.OKLAB: return this.okLabManipulation(color1, color2);
            case BlendingType.OKLCH: return this.okLchManipulation(color1, color2);
            case BlendingType.ALPHA_75_25: return this.alphaBlending(color1, color2, 191, 63);
            case BlendingType.ALPHA_50_50: return this.alphaBlending(color1, color2, 127, 127);
            case BlendingType.ALPHA_25_75: return this.alphaBlending(color1, color2, 63, 191);
            case BlendingType.ADDITIVE: return this.additiveBlending(color1, color2);
            case BlendingType.MULTIPLICATIVE: return this.multiplicativeBlending(color1, color2);
        }
    }

    private intensityManipulation(color1: RGB, color2: RGB): RGB {
        const factor = converter.getBrightness(color2);
        return {
            r: Math.round(factor * color1.r),
            g: Math.round(factor * color1.g),
            b: Math.round(factor * color1.b),
        };
    }

    private hslManipulation(color1: RGB, color2: RGB): RGB {
        const factorH = color2.r / 255;
        const factorS = color2.g / 255;
        const factorL = color2.b / 255;
        const { h, s, l } = converter.rgbToHsl(color1);
        const newH = Math.max(0, Math.min(360, h * factorH));
        const newS = Math.max(0, Math.min(1, s * factorS));
        const newL = Math.max(0, Math.min(1, l * factorL));
        return converter.hslToRgb({ h: newH, s: newS, l: newL });
    }

    private okLabManipulation(color1: RGB, color2: RGB): RGB {
        const factorL = color2.r / 255;
        const factorA = color2.g / 255;
        const factorB = color2.b / 255;
        const okLab = converter.rgbToOklab(color1);
        okLab.L = Math.max(0, Math.min(1, okLab.L * factorL));
        okLab.a = Math.max(-0.5, Math.min(0.5, okLab.a * factorA));
        okLab.b = Math.max(-0.5, Math.min(0.5, okLab.b * factorB));
        return converter.oklabToRgb(okLab);
    }

    private okLchManipulation(color1: RGB, color2: RGB): RGB {
        const factorL = color2.r / 255;
        const factorA = color2.g / 255;
        const factorB = color2.b / 255;
        const okLch = converter.rgbToOklch(color1);
        okLch.L = Math.max(0, Math.min(1, okLch.L * factorL));
        okLch.c = Math.max(0, Math.min(0.5, okLch.c * factorA));
        okLch.h = Math.max(0, Math.min(360, okLch.h * factorB));
        return converter.oklchToRgb(okLch);
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
