import { UiFieldFloat, UiFieldHeader, UiFieldInteger, UiFieldString, UiFieldStringEnum } from '../../../shared/config';
import { Easing } from '../../math/color-mapper/color-mapper';
import { NoiseType } from '../../math/noise-generator/noise-generator';

/** Header */
export function uiSchemaHeader(text: string): UiFieldHeader {
    return new UiFieldHeader(text);
}

export const UI_SCHEMA_HEADER_GRADIENT = uiSchemaHeader('Gradient');

export const UI_SCHEMA_HEADER_NOISE = uiSchemaHeader('Noise');

export const UI_SCHEMA_HEADER_FRACTAL = uiSchemaHeader('Fractal');

export const UI_SCHEMA_HEADER_LIC = uiSchemaHeader('LIC');


/** Gradient */
export function uiSchemaGradientSupportPoints(path: string): UiFieldString {
    return new UiFieldString(path, 'Support Points', 'Input for Gradient support points. Syntax comma separated x:color, e.g. \'0:#FF0000, 1:#0000FF\'');
}

export function uiSchemaGradientEasing(path: string): UiFieldStringEnum<Record<string, unknown>> {
    return new UiFieldStringEnum<Record<string, unknown>>(path, Easing, 'Easing', 'How Gradient behaves around the support points');
}

export function uiSchemaGradientScaling(path: string): UiFieldFloat {
    return new UiFieldFloat(path, 'Scaling', 'Gradient is scaled by this factor', 0.01, 10000);
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
    return new UiFieldFloat(path, 'LIC Length', 'Length for LIC path calculation (expensive)', 1, 200);
}