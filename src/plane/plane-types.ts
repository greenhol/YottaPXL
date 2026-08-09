export type PlaneId =
    'MANDELBROT_ITERATIONS' |
    'MANDELBROT_DISTANCE' |
    'MANDELBROT_VECTOR' |
    'MANDELBROT_BOKEH' |
    'MANDELBROT_COMBINED_ID' |
    'MANDELBROT_COMBINED_IV' |
    'CHARGES' |
    'WEATHER' |
    'ATMOSPHERE' |
    'PERLIN_FIELD' |
    'NOISE' |
    'PERLIN_NOISE' |
    'BOKEH' |
    'GRADIENT' |
    'COLOUR_BLEND';

export interface PlaneType {
    id: PlaneId,
    short: string,
    description: string,
}

export interface PlaneGroup {
    name: string,
    planes: PlaneType[],
}

export const PLANE_SELECTOR: PlaneGroup[] = [
    {
        name: 'Mandelbrot',
        planes: [
            { id: 'MANDELBROT_ITERATIONS', short: 'Iterations', description: 'Mandelbrot set visualization by number of iterations' },
            { id: 'MANDELBROT_DISTANCE', short: 'Distance', description: 'Mandelbrot set visualization by approximated distance to the border' },
            { id: 'MANDELBROT_VECTOR', short: 'Vector Field', description: 'Mandelbrot set visualization by distance approximation displayed as a vector field' },
            { id: 'MANDELBROT_BOKEH', short: 'Bokeh', description: 'Mandelbrot set visualization by distance approximation displayed with Bokeh applied' },
            { id: 'MANDELBROT_COMBINED_ID', short: 'Combination of Iterations and Distance', description: 'Mandelbrot set visualization by combining number of iterations with approximated distance' },
            { id: 'MANDELBROT_COMBINED_IV', short: 'Combination of Iterations and Vector Field', description: 'Mandelbrot set visualization by combining number of iterations with vector field' },
        ],
    }, {
        name: 'Vector Fields',
        planes: [
            { id: 'CHARGES', short: 'Charge Field', description: 'A vector field visualization for a charge field using an LIC algorithm' },
            { id: 'WEATHER', short: 'Weather patterns', description: 'A vector field visualization for weather patterns of pressure systems' },
            { id: 'ATMOSPHERE', short: 'Atmosphere', description: 'A vector field visualization for a simulated gas planet atmosphere' },
            { id: 'PERLIN_FIELD', short: 'Perlin Field', description: 'A vector field visualization for perlin gradient fields' },
        ],
    }, {
        name: 'Ingredients',
        planes: [
            { id: 'NOISE', short: 'Noise types', description: 'A set of different noise types' },
            { id: 'PERLIN_NOISE', short: 'Perlin Noise', description: 'Perlin Noise' },
            { id: 'BOKEH', short: 'Bokeh', description: 'Bokeh simulation' },
            { id: 'GRADIENT', short: 'Colour Gradients', description: 'A selection of colour gradients and custom for defining your own' },
            { id: 'COLOUR_BLEND', short: 'Colour Blending', description: 'A selection of colour blenders demonstrated on gradients' },
        ],
    },
];
