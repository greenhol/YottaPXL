import { converter } from './colour-converter';
import { RGB } from './colour';

export enum BlendingType {
    INTENSITY = 'Intensity Manipulation',
    HSL = 'HSL Manipulation',
    OKLAB = 'OKLab Manipulation',
    OKLCH = 'OKLch Manipulation',
    ALPHA_75_25 = 'Alpha Blending 75:25',
    ALPHA_50_50 = 'Alpha Blending 50:50',
    ALPHA_25_75 = 'Alpha Blending 25:75',
    ADDITIVE = 'Additive Blending',
    MULTIPLICATIVE = 'Multiplicative Blending',
}

class ColourBlender {

    public blend(colour1: RGB, colour2: RGB, type: BlendingType): RGB {
        switch (type) {
            case BlendingType.INTENSITY: return this.intensityManipulation(colour1, colour2);
            case BlendingType.HSL: return this.hslManipulation(colour1, colour2);
            case BlendingType.OKLAB: return this.okLabManipulation(colour1, colour2);
            case BlendingType.OKLCH: return this.okLchManipulation(colour1, colour2);
            case BlendingType.ALPHA_75_25: return this.alphaBlending(colour1, colour2, 191, 63);
            case BlendingType.ALPHA_50_50: return this.alphaBlending(colour1, colour2, 127, 127);
            case BlendingType.ALPHA_25_75: return this.alphaBlending(colour1, colour2, 63, 191);
            case BlendingType.ADDITIVE: return this.additiveBlending(colour1, colour2);
            case BlendingType.MULTIPLICATIVE: return this.multiplicativeBlending(colour1, colour2);
        }
    }

    private intensityManipulation(colour1: RGB, colour2: RGB): RGB {
        const factor = converter.getBrightness(colour2);
        return {
            r: Math.round(factor * colour1.r),
            g: Math.round(factor * colour1.g),
            b: Math.round(factor * colour1.b),
        };
    }

    private hslManipulation(colour1: RGB, colour2: RGB): RGB {
        const factorH = colour2.r / 255;
        const factorS = colour2.g / 255;
        const factorL = colour2.b / 255;
        const { h, s, l } = converter.rgbToHsl(colour1);
        const newH = Math.max(0, Math.min(360, h * factorH));
        const newS = Math.max(0, Math.min(1, s * factorS));
        const newL = Math.max(0, Math.min(1, l * factorL));
        return converter.hslToRgb({ h: newH, s: newS, l: newL });
    }

    private okLabManipulation(colour1: RGB, colour2: RGB): RGB {
        const factorL = colour2.r / 255;
        const factorA = colour2.g / 255;
        const factorB = colour2.b / 255;
        const okLab = converter.rgbToOkLab(colour1);
        okLab.L = Math.max(0, Math.min(1, okLab.L * factorL));
        okLab.a = Math.max(-0.5, Math.min(0.5, okLab.a * factorA));
        okLab.b = Math.max(-0.5, Math.min(0.5, okLab.b * factorB));
        return converter.okLabToRgb(okLab);
    }

    private okLchManipulation(colour1: RGB, colour2: RGB): RGB {
        const factorL = colour2.r / 255;
        const factorA = colour2.g / 255;
        const factorB = colour2.b / 255;
        const okLch = converter.rgbToOkLch(colour1);
        okLch.L = Math.max(0, Math.min(1, okLch.L * factorL));
        okLch.c = Math.max(0, Math.min(0.5, okLch.c * factorA));
        okLch.h = Math.max(0, Math.min(360, okLch.h * factorB));
        return converter.okLchToRgb(okLch);
    }

    private alphaBlending(colour1: RGB, colour2: RGB, alpha1: number, alpha2: number): RGB {
        // Blend each channel (R, G, B)
        const r = Math.round((colour1.r * alpha1 + colour2.r * alpha2 * (1 - alpha1 / 255)) / (alpha1 + alpha2 * (1 - alpha1 / 255)));
        const g = Math.round((colour1.g * alpha1 + colour2.g * alpha2 * (1 - alpha1 / 255)) / (alpha1 + alpha2 * (1 - alpha1 / 255)));
        const b = Math.round((colour1.b * alpha1 + colour2.b * alpha2 * (1 - alpha1 / 255)) / (alpha1 + alpha2 * (1 - alpha1 / 255)));
        return { r, g, b };
    }

    private additiveBlending(colour1: RGB, colour2: RGB): RGB {
        return {
            r: Math.round((colour1.r + colour2.r) / 2),
            g: Math.round((colour1.g + colour2.g) / 2),
            b: Math.round((colour1.b + colour2.b) / 2)
        };
    }

    private multiplicativeBlending(colour1: RGB, colour2: RGB): RGB {
        return {
            r: Math.round((colour1.r / 255) * (colour2.r / 255) * 255),
            g: Math.round((colour1.g / 255) * (colour2.g / 255) * 255),
            b: Math.round((colour1.b / 255) * (colour2.b / 255) * 255)
        };
    }
}

export const blender = new ColourBlender();
