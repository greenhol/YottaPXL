import { ConfigUiFieldCreator, UiFieldBool, UiFieldColor, UiFieldFloat, UiFieldInteger, UiFieldString, UiFieldStringEnum } from '../../../shared/config';
import { BlendingType } from '../../math/color/color-blender';
import { Easing } from '../../math/color/color-mapper';
import { NoiseType } from '../../math/noise-generator/noise-generator';

class PlaneConfigFieldCreator extends ConfigUiFieldCreator {

    /** Header */
    public readonly UI_FIELD_HEADER_BLENDING = this.createHeader('Blending');
    public readonly UI_FIELD_HEADER_GRADIENT = this.createHeader('Gradient');
    public readonly UI_FIELD_HEADER_NOISE = this.createHeader('Noise');
    public readonly UI_FIELD_HEADER_FRACTAL = this.createHeader('Fractal');
    public readonly UI_FIELD_HEADER_LIC = this.createHeader('LIC');
    public readonly UI_FIELD_HEADER_FIELD = this.createHeader('Field');

    /** Color */
    public uiFieldGradientSupportPoints(path: string): UiFieldString {
        return this.createStringField(path, 'Support Points', 'Input for Gradient support points. Syntax comma separated x:color, e.g. \'0:#FF0000, 1:#0000FF\'');
    }
    public uiFieldGradientEasing(path: string): UiFieldStringEnum<Record<string, unknown>> {
        return this.createEnumField<Record<string, unknown>>(path, Easing, 'Easing', 'How Gradient behaves around the support points');
    }
    public uiFieldGradientScaling(path: string): UiFieldFloat {
        return this.createFloatField(path, 'Scaling', 'Gradient is scaled by this factor', 0.00001, 10000);
    }
    public uiFieldColorBlending(path: string): UiFieldStringEnum<Record<string, unknown>> {
        return new UiFieldStringEnum<Record<string, unknown>>(
            path,
            BlendingType,
            'Blending Type',
            'Combines two Colors:\n' +
            '\'Manipulation\' uses the channels of Color 2 to manipulate Color 1 by properties of different color spaces\n' +
            '\'Blending\' blends all channels in different ways directly',
        );
    }
    public uiFieldFallbackColor(path: string): UiFieldColor {
        return this.createColorField(path, 'Fallback Color', 'Fallback Color for pixels of undefined values');
    }

    /** Noise */
    public uiFieldNoiseType(path: string): UiFieldStringEnum<Record<string, unknown>> {
        return this.createEnumField<Record<string, unknown>>(path, NoiseType, 'Noise Type', '');
    }
    public uiFieldNoiseP(path: string): UiFieldFloat {
        return this.createFloatField(path, 'p for Bernoulli Noises', 'Probability a pixel is set to Black or White', 0, 1);
    }
    public uiFieldNoiseScaling(path: string): UiFieldInteger {
        return this.createIntegerField(path, 'Scaling', 'Noise Image is scaled by this factor', 1, 10);
    }

    /** Fractal */
    public uiFieldFractalMaxIterations(path: string): UiFieldInteger {
        return this.createIntegerField(path, 'Max Iterations', 'Maximum iterations (0: automatic estimation)', 0, 100000);
    }
    public uiFieldFractalEscapeValue(path: string): UiFieldFloat {
        return this.createFloatField(path, 'Escape Value', 'Escape value', 2, 1000);
    }
    public uiFieldFractalInterpolate(path: string): UiFieldBool {
        return this.createBoolField(path, 'Interpolate', 'Estimate interpolated values between iterations');
    }
    public uiFieldFractalPrecision(path: string): UiFieldBool {
        return this.createBoolField(path, 'Precision', 'Compute with higher precision using Perturbation theory.\nOnly use when precision of numbers runs out (blocky image)');
    }
    public uiFieldFractalReferenceCoordinate(path: string): UiFieldString {
        return this.createStringField(path, 'Coord for Precision', 'Reference point in Pixels used for Perturbation theory. Syntax: Comma separated row, col (e.g. 200, 350)\nIf empty, a grid scan will try to find a suitable point.');
    }

    /** LIC */
    public uiFieldLicLenth(path: string): UiFieldFloat {
        return this.createFloatField(path, 'LIC Length', 'Length for LIC path calculation (expensive)', 1, 300);
    }
    public uiFieldLicMinLenth(path: string): UiFieldFloat {
        return this.createFloatField(path, 'LIC min. Length', 'Minimum Length for LIC path calculation when dynamic', 1, 200);
    }
    public uiFieldLicMaxLenth(path: string): UiFieldFloat {
        return this.createFloatField(path, 'LIC max. Length', 'Maximum Length for LIC path calculation (expensive)', 1, 300);
    }
    public uiFieldLicStrength(path: string): UiFieldFloat {
        return this.createFloatField(path, 'LIC Strength Factor', 'Strength multiplicator for streamlines.\nIf set to negative value, max Lenth will be used everywhere', -1, 1000);
    }
}

export const CREATE = new PlaneConfigFieldCreator();
