export type PlaneId = 'NOISE' | 'LIC' | 'MANDELBROT_ITERATIONS' | 'MANDELBROT_DISTANCE' | 'MANDELBROT_VECTOR';

export interface PlaneType {
    id: PlaneId,
    short: string,
    description: string,
}

export const VALID_PLANE_IDS: PlaneId[] = ['NOISE', 'LIC', 'MANDELBROT_ITERATIONS', 'MANDELBROT_DISTANCE', 'MANDELBROT_VECTOR'];

export const PLANE_TYPES: PlaneType[] = [
    { id: 'NOISE', short: 'Noise types', description: 'A set of different noise types' },
    { id: 'LIC', short: 'Line Integral Convolution', description: 'A vector field visualization using an LIC algorithm' },
    { id: 'MANDELBROT_ITERATIONS', short: 'Mandelbrot Iterations', description: 'Mandelbrot set visualization by number of iterations' },
    { id: 'MANDELBROT_DISTANCE', short: 'Mandelbrot Distance', description: 'Mandelbrot set visualization by approximated distance to the border' },
    { id: 'MANDELBROT_VECTOR', short: 'Mandelbrot Vector Field', description: 'Mandelbrot set visualization by distance approximation displayed as a vector field' },
];