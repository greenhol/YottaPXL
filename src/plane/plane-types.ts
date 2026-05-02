export type PlaneId =
    'MANDELBROT_ITERATIONS' |
    'MANDELBROT_DISTANCE' |
    'MANDELBROT_VECTOR' |
    'MANDELBROT_COMBINED_ID' |
    'MANDELBROT_COMBINED_IV' |
    'CHARGES' |
    'WEATHER' |
    'NOISE' |
    'PERLIN_NOISE' |
    'GRADIENT' |
    'COLOR_BLEND';

export interface PlaneType {
    id: PlaneId,
    short: string,
    description: string,
}

export const VALID_PLANE_IDS: PlaneId[] = [
    'MANDELBROT_ITERATIONS',
    'MANDELBROT_DISTANCE',
    'MANDELBROT_VECTOR',
    'MANDELBROT_COMBINED_ID',
    'MANDELBROT_COMBINED_IV',
    'CHARGES',
    'WEATHER',
    'NOISE',
    'PERLIN_NOISE',
    'GRADIENT',
    'COLOR_BLEND',
];

export const PLANE_TYPES: PlaneType[] = [
    { id: 'MANDELBROT_ITERATIONS', short: 'Mandelbrot Iterations', description: 'Mandelbrot set visualization by number of iterations' },
    { id: 'MANDELBROT_DISTANCE', short: 'Mandelbrot Distance', description: 'Mandelbrot set visualization by approximated distance to the border' },
    { id: 'MANDELBROT_VECTOR', short: 'Mandelbrot Vector Field', description: 'Mandelbrot set visualization by distance approximation displayed as a vector field' },
    { id: 'MANDELBROT_COMBINED_ID', short: 'Mandelbrot Combined: Iterations / Distance', description: 'Mandelbrot set visualization by combining number of iterations with approximated distance' },
    { id: 'MANDELBROT_COMBINED_IV', short: 'Mandelbrot Combined: Iterations / Vector Field', description: 'Mandelbrot set visualization by combining number of iterations with vector field' },
    { id: 'CHARGES', short: 'Charge Field', description: 'A vector field visualization for a charge field using an LIC algorithm' },
    { id: 'WEATHER', short: 'Weather patterns', description: 'A vector field visualization for for weather patterns of pressure systems' },
    { id: 'NOISE', short: 'Noise types', description: 'A set of different noise types' },
    { id: 'PERLIN_NOISE', short: 'Perlin Noise', description: 'Perlin Noise' },
    { id: 'GRADIENT', short: 'Color Gradients', description: 'A selection of color gradients and custom for defining your own' },
    { id: 'COLOR_BLEND', short: 'Color Blending', description: 'A selection of color blenders demonstrated on gradients' },
];
