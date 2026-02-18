export type PlaneId = 'NOISE' | 'CHARGES' | 'WEATHER' | 'MANDELBROT_ITERATIONS' | 'MANDELBROT_DISTANCE' | 'MANDELBROT_VECTOR';

export interface PlaneType {
    id: PlaneId,
    short: string,
    description: string,
}

export const VALID_PLANE_IDS: PlaneId[] = ['NOISE', 'CHARGES', 'WEATHER', 'MANDELBROT_ITERATIONS', 'MANDELBROT_DISTANCE', 'MANDELBROT_VECTOR'];

export const PLANE_TYPES: PlaneType[] = [
    { id: 'NOISE', short: 'Noise types', description: 'A set of different noise types' },
    { id: 'CHARGES', short: 'Charge Field', description: 'A vector field visualization for a charge field using an LIC algorithm' },
    { id: 'WEATHER', short: 'Weather patterns', description: 'A vector field visualization for for weather patterns of pressure systems' },
    { id: 'MANDELBROT_ITERATIONS', short: 'Mandelbrot Iterations', description: 'Mandelbrot set visualization by number of iterations' },
    { id: 'MANDELBROT_DISTANCE', short: 'Mandelbrot Distance', description: 'Mandelbrot set visualization by approximated distance to the border' },
    { id: 'MANDELBROT_VECTOR', short: 'Mandelbrot Vector Field', description: 'Mandelbrot set visualization by distance approximation displayed as a vector field' },
];