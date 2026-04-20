import { UiFieldColor, UiFieldFloat, UiFieldHeader, UiFieldInteger, UiFieldString, UiFieldStringEnum } from '../../../shared/config';
import { BlendingType } from '../../math/color/color-blender';
import { Easing } from '../../math/color/color-mapper';
import { NoiseType } from '../../math/noise-generator/noise-generator';

// ToDo: refactor to a single const export like unique.ts or color.blender.ts

/** Header */
export function uiSchemaHeader(text: string, description: string = ''): UiFieldHeader {
    return new UiFieldHeader(text, description);
}

export const UI_SCHEMA_HEADER_BLENDING = uiSchemaHeader('Blending');

export const UI_SCHEMA_HEADER_GRADIENT = uiSchemaHeader('Gradient');

export const UI_SCHEMA_HEADER_NOISE = uiSchemaHeader('Noise');

export const UI_SCHEMA_HEADER_FRACTAL = uiSchemaHeader('Fractal');

export const UI_SCHEMA_HEADER_LIC = uiSchemaHeader('LIC');

export const UI_SCHEMA_HEADER_FIELD = uiSchemaHeader('Field');


/** Color */
export function uiSchemaGradientSupportPoints(path: string): UiFieldString {
    return new UiFieldString(path, 'Support Points', 'Input for Gradient support points. Syntax comma separated x:color, e.g. \'0:#FF0000, 1:#0000FF\'');
}

export function uiSchemaGradientEasing(path: string): UiFieldStringEnum<Record<string, unknown>> {
    return new UiFieldStringEnum<Record<string, unknown>>(path, Easing, 'Easing', 'How Gradient behaves around the support points');
}

export function uiSchemaGradientScaling(path: string): UiFieldFloat {
    return new UiFieldFloat(path, 'Scaling', 'Gradient is scaled by this factor', 0.00001, 10000);
}

export function uiSchemaColorBlending(path: string): UiFieldStringEnum<Record<string, unknown>> {
    return new UiFieldStringEnum<Record<string, unknown>>(
        path,
        BlendingType,
        'Blending Type',
        'Combines two Colors:\n' +
        '\'Manipulation\' uses the channels of Color 2 to manipulate Color 1 by properties of different color spaces\n' +
        '\'Blending\' blends all channels in different ways directly',
    );
}

export function uiSchemaFallbackColor(path: string): UiFieldColor {
    return new UiFieldColor(path, 'Fallback Color', 'Fallback Color for pixels of undefined values');
}

/** Noise */
export function uiSchemaNoiseType(path: string): UiFieldStringEnum<Record<string, unknown>> {
    return new UiFieldStringEnum<Record<string, unknown>>(path, NoiseType, 'Noise Type', '');
}

export function uiSchemaNoiseP(path: string): UiFieldFloat {
    return new UiFieldFloat(path, 'p for Bernoulli Noises', 'Probability a pixel is set to Black or White', 0, 1);
}

export function uiSchemaNoiseScaling(path: string): UiFieldInteger {
    return new UiFieldInteger(path, 'Scaling', 'Noise Image is scaled by this factor', 1, 10);
}

/** Fractal */
export function uiSchemaFractalMaxIterations(path: string): UiFieldInteger {
    return new UiFieldInteger(path, 'Max Iterations', 'Maximum iterations (0: automatic estimation)', 0, 100000);
}

export function uiSchemaFractalEscapeValue(path: string): UiFieldFloat {
    return new UiFieldFloat(path, 'Escape Value', 'Escape value', 2, 1000);
}

/** LIC */
export function uiSchemaLicLenth(path: string): UiFieldFloat {
    return new UiFieldFloat(path, 'LIC Length', 'Length for LIC path calculation (expensive)', 1, 300);
}

export function uiSchemaLicMinLenth(path: string): UiFieldFloat {
    return new UiFieldFloat(path, 'LIC min. Length', 'Minimum Length for LIC path calculation when dynamic', 1, 200);
}

export function uiSchemaLicMaxLenth(path: string): UiFieldFloat {
    return new UiFieldFloat(path, 'LIC max. Length', 'Maximum Length for LIC path calculation (expensive)', 1, 300);
}

export function uiSchemaLicStrength(path: string): UiFieldFloat {
    return new UiFieldFloat(path, 'LIC Strength Factor', 'Strength multiplicator for streamlines.\nIf set to negative value, max Lenth will be used everywhere', -1, 1000);
}
