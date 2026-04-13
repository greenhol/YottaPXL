import { InitializeAfterConstruct } from '../../../shared';
import { ModuleConfig } from '../../../shared/config';
import { GridRange, rangeXdiff } from '../../grid/grid-range';
import { ColorMapper, ColorMapperConfig, Easing } from '../../math/color/color-mapper';
import { MandelbrotCalculator } from '../../math/complex-fractal/mandelbrot-calculator';
import { extractData } from '../../worker/extract-data';
import { Plane, PlaneConfig } from '../plane';
import { UI_SCHEMA_HEADER_FRACTAL, uiSchemaFractalEscapeValue, uiSchemaFractalMaxIterations, uiSchemaGradientEasing, uiSchemaGradientScaling, uiSchemaGradientSupportPoints, uiSchemaHeader } from '../ui-schema/ui-fields';
import { estimateMaxIterations } from './estimate-max-iterations';

interface MandelbrotCombinedConfig extends PlaneConfig {
    maxIterations: number,
    escapeValue: number,
    gradientIterations: ColorMapperConfig,
    gradientDistance: ColorMapperConfig,
}

const INITIAL_GRID_RANGE: GridRange = { xMin: -3, xMax: 1.8, yCenter: 0 };

@InitializeAfterConstruct()
export class MandelbrotCombined extends Plane {

    private _effectiveMaxIterations = 255;

    override config: ModuleConfig<MandelbrotCombinedConfig> = new ModuleConfig(
        {
            gridRange: INITIAL_GRID_RANGE,
            maxIterations: 0,
            escapeValue: 100,
            gradientIterations: {
                supportPoints: '0:#00FF00, 0.5:#88FF88, 1:#00FF00',
                easing: Easing.RGB_LINEAR,
                scaling: 1,
            },
            gradientDistance: {
                supportPoints: '0:#FFFFFF, 0.4:#FFFFFF, 0.5:#000000, 0.6:#FFFFFF, 1:#FFFFFF',
                easing: Easing.RGB_LINEAR,
                scaling: 0.1,
            },
        },
        'mandelbrotCombinedConfig',
        [
            UI_SCHEMA_HEADER_FRACTAL,
            uiSchemaFractalMaxIterations('maxIterations'),
            uiSchemaFractalEscapeValue('escapeValue'),
            uiSchemaHeader('Iterations Gradient'),
            uiSchemaGradientSupportPoints('gradientIterations.supportPoints'),
            uiSchemaGradientEasing('gradientIterations.easing'),
            uiSchemaGradientScaling('gradientIterations.scaling'),
            uiSchemaHeader('Distance Gradient'),
            uiSchemaGradientSupportPoints('gradientDistance.supportPoints'),
            uiSchemaGradientEasing('gradientDistance.easing'),
            uiSchemaGradientScaling('gradientDistance.scaling'),
        ],
    );

    override refresh() {
        this.calculate();
    }

    private async calculate() {
        this._effectiveMaxIterations = estimateMaxIterations(this.config.data.maxIterations, rangeXdiff(INITIAL_GRID_RANGE), this.grid.xDiff);
        console.log(`#calculate - with max iterations ${this._effectiveMaxIterations}`);

        this.setProgress(0);
        // Iterations
        const calculationIterations$ = new MandelbrotCalculator().calculateIterations(this.grid, this._effectiveMaxIterations);
        calculationIterations$.subscribe({ next: (state) => { this.setProgress(state.progress, 'Iterations 1/2'); } });
        const iterationsData = await extractData(calculationIterations$, 'mandelbrot iterations');

        // Distances
        const calculationDistances$ = new MandelbrotCalculator().calculateDistances(this.grid, this._effectiveMaxIterations, this.config.data.escapeValue);
        calculationDistances$.subscribe({ next: (state) => { this.setProgress(state.progress, 'Distances 2/2'); } });
        const distancesData = await extractData(calculationDistances$, 'mandelbrot distances');

        this.updateImage(this.createImage(iterationsData, distancesData));
        this.setIdle();
    }

    private createImage(iterations: Float64Array, distances: Float64Array): ImageDataArray {
        const imageData = new Uint8ClampedArray(this.grid.size * 4);
        const colorMapperIterations = ColorMapper.fromString(this.config.data.gradientIterations.supportPoints, this.config.data.gradientIterations.easing);
        let max = 0;
        distances.forEach(value => { if (value > max) max = value; });
        const colorMapperDistances = ColorMapper.fromString(this.config.data.gradientDistance.supportPoints, this.config.data.gradientDistance.easing);
        this.config.setInfo('Iterations Gradient', colorMapperIterations.supportPointsString);
        this.config.setInfo('Distances Gradient', colorMapperDistances.supportPointsString);

        for (let row = 0; row < this.grid.height; row++) {
            for (let col = 0; col < this.grid.width; col++) {
                const index = this.grid.getIndex(col, row);
                const pixelIndex = index * 4;
                const valueIterations = iterations[index];
                if (valueIterations === this._effectiveMaxIterations) {
                    imageData[pixelIndex] = 0;     // R
                    imageData[pixelIndex + 1] = 0; // G
                    imageData[pixelIndex + 2] = 0; // B
                    imageData[pixelIndex + 3] = 255; // A (opaque)
                } else {
                    const color = colorMapperIterations.map(valueIterations, 255 * this.config.data.gradientIterations.scaling);
                    const valueFactor = colorMapperDistances.map(distances[index], max * this.config.data.gradientDistance.scaling).r / 255;
                    imageData[pixelIndex] = Math.round(valueFactor * color.r);     // R
                    imageData[pixelIndex + 1] = Math.round(valueFactor * color.g); // G
                    imageData[pixelIndex + 2] = Math.round(valueFactor * color.b); // B
                    imageData[pixelIndex + 3] = 255;                               // A (opaque)
                }
            }
        }
        return imageData;
    }

    private mapLinear(value: number, maxValue: number): number {
        if (maxValue === 0) return 0; // Avoid division by zero
        return 1 - (value / maxValue);
    }

    private mapSine(value: number, maxValue: number): number {
        if (maxValue === 0) return 1; // Avoid division by zero
        const normalizedValue = value / maxValue;
        // Use a half-period sine wave (0 to π)
        const sineValue = Math.sin(normalizedValue * Math.PI);
        // Square the sine to get a smooth curve from 1 to 0 and back to 1
        return 1 - sineValue * sineValue;
    }

    private mapLog(value: number, maxValue: number, beta: number = 1000, gamma: number = 2): number {
        if (maxValue === 0) return 1;
        const normalizedValue = value / maxValue;
        // Intensified logarithmic scaling
        const logNumerator = Math.log(1 + beta * Math.pow(normalizedValue, gamma));
        const logDenominator = Math.log(1 + beta);
        return 1 - logNumerator / logDenominator;
    }

    private mapToSineOscillations(value: number, maxValue: number, numOscillations: number): number {
        if (maxValue === 0) return 0; // Avoid division by zero
        const normalizedValue = value / maxValue;
        const scaledValue = normalizedValue * numOscillations * 2 * Math.PI;
        const sineValue = Math.sin(scaledValue);
        // Rescale from [-1, 1] to [0, 1]
        return (1 + sineValue) / 2;
    }

    private mapToLogSineOscillations(value: number, maxValue: number, numOscillations: number, alpha: number = 10): number {
        if (maxValue === 0) return 0;
        const normalizedValue = value / maxValue;
        // Logarithmic warp
        const warpedValue = Math.log(1 + alpha * normalizedValue) / Math.log(1 + alpha);
        // Scale and apply sine
        const scaledValue = warpedValue * numOscillations * 2 * Math.PI;
        const sineValue = Math.sin(scaledValue);
        // Rescale to [0, 1]
        return (1 + sineValue) / 2;
    }
}