import { lastValueFrom } from 'rxjs';
import { InitializeAfterConstruct } from '../../../shared';
import { ModuleConfig } from '../../../shared/config';
import { Grid } from '../../grid/grid';
import { GridRange } from '../../grid/grid-range';
import { GridWithMargin } from '../../grid/grid-with-margin';
import { LicCalculator, SourceData } from '../../math/lic/lic-calculator';
import { NoiseConfig, NoiseGenerator, NoiseType } from '../../math/noise-generator/noise-generator';
import { NoiseScaleFactor } from '../../math/noise-generator/types';
import { VectorFieldGenerator } from '../../math/vector-field/vector-field-generator';
import { PressureRegion } from '../../math/vector-field/weather-field/types';
import { COLOR, createGrey, RGB } from '../../types';
import { extractData } from '../../worker/extract-data';
import { Plane, PlaneConfig } from '../plane';
import { UI_SCHEMA_HEADER_LIC, UI_SCHEMA_HEADER_NOISE, uiSchemaLicLenth, uiSchemaNoiseP, uiSchemaNoiseScaling, uiSchemaNoiseType } from '../ui-schema/ui-fields';

interface WeatherConfig extends PlaneConfig {
    noiseConfig: NoiseConfig,
    licLength: number,
}

const INITIAL_GRID_RANGE: GridRange = { xMin: -180, xMax: 180, yCenter: 0 };

@InitializeAfterConstruct()
export class Weather extends Plane {

    private _pressureRegions: PressureRegion[] = [];

    constructor(grid: Grid) {
        super(grid);

        const pressureRegions = [
            { x: 0.0, y: -70.0, strength: 988, spread: 36, isLowPressure: true },      // Antarctic Low (Low)
            { x: 95.0, y: 60.0, strength: 1036, spread: 36, isLowPressure: false },   // Siberian High (High)
            { x: 135.0, y: -25.0, strength: 1000, spread: 36, isLowPressure: true },   // Australian Low (Low)
            { x: 145.0, y: 45.0, strength: 1028, spread: 36, isLowPressure: false },   // North Pacific High (High)
            { x: 170.0, y: 52.0, strength: 992, spread: 36, isLowPressure: true },    // Aleutian Low (Low)
            { x: 265.0, y: 35.0, strength: 1026, spread: 36, isLowPressure: false },  // North American High (Bermuda High)
            { x: 270.0, y: 55.0, strength: 996, spread: 36, isLowPressure: true },    // Canadian Low (Low)
            { x: 280.0, y: -30.0, strength: 1020, spread: 36, isLowPressure: false },  // South Pacific High (High)
            { x: 340.0, y: 38.0, strength: 1024, spread: 36, isLowPressure: false },  // Azores High (High)
            { x: 340.0, y: 65.0, strength: 980, spread: 36, isLowPressure: true },    // Icelandic Low (Low)
        ];
        // const pressureRegions = [
        //     { x: 90, y: 30, strength: 1000, spread: 36, isLowPressure: true },
        //     { x: 270, y: -45, strength: 1000, spread: 36, isLowPressure: false },
        // ];
        // const pressureRegions = [];
        // for (let index = 0; index < 10; index++) {
        //     pressureRegions.push({
        //         x: Math.random() * 360,
        //         y: SOUTH + Math.random() * (NORTH - SOUTH),
        //         strength: (0.25 + Math.random()) * 1000,
        //         spread: 36,
        //         isLowPressure: Math.round(Math.random()) == 0,
        //     });
        // }

        pressureRegions.forEach((region) => {
            const regionLeft = structuredClone(region);
            regionLeft.x -= 360;
            const regionRight = structuredClone(region);
            regionRight.x += 360;
            this._pressureRegions.push(regionLeft);
            this._pressureRegions.push(region);
            this._pressureRegions.push(regionRight);
        });
    }

    override config: ModuleConfig<WeatherConfig> = new ModuleConfig(
        {
            gridRange: INITIAL_GRID_RANGE,
            noiseConfig: {
                type: NoiseType.BERNOULLI_ISOLATED_BIG,
                p: 0.05,
                scaling: NoiseScaleFactor.NONE,
            },
            licLength: 20,
        },
        'weatherConfig',
        [
            UI_SCHEMA_HEADER_NOISE,
            uiSchemaNoiseType('noiseConfig.type'),
            uiSchemaNoiseP('noiseConfig.p'),
            uiSchemaNoiseScaling('noiseConfig.scaling'),
            UI_SCHEMA_HEADER_LIC,
            uiSchemaLicLenth('licLength'),
        ],
    );

    override refresh() {
        this.calculate();
    }

    private async calculate() {
        this.setProgress(0);

        // Create Source Field
        const sourceGrid = new GridWithMargin(this.grid.resolution, this.config.data.gridRange, 2 * this.config.data.licLength);
        const fieldGenerator = new VectorFieldGenerator(sourceGrid);
        const fieldCalculation$ = fieldGenerator.createWeatherField(this._pressureRegions, 1);
        fieldCalculation$.subscribe({ next: (state) => { this.setProgress(state.progress, 'Source 1/2'); } });
        const field = await extractData(fieldCalculation$, 'charges field');

        // Create Source Image
        const noiseGenerator = new NoiseGenerator(sourceGrid);
        const generator$ = noiseGenerator.createNoise(this.config.data.noiseConfig);
        const noise = await extractData(generator$, 'noise');

        // Draw Source Image
        const sourceData: SourceData = {
            grid: sourceGrid,
            image: noise,
            field: field,
        };
        this.updateImage(this.createSourceImage(sourceData));

        // LIC
        const calculator: LicCalculator = new LicCalculator(sourceData, this.grid);
        const calculation$ = calculator.calculate(this.config.data.licLength, 5, 3.6);
        calculation$.subscribe({ next: (state) => { this.setProgress(state.progress, 'LIC 2/2'); } });
        const result = await lastValueFrom(calculation$);
        if (result.data != null) {
            this.updateImage(this.createImage(result.data));
            this.setIdle();
        } else {
            console.error('#calculateAndDraw - calculation did not produce data');
        }
    }

    private createSourceImage(source: SourceData): ImageDataArray {
        const imageData = new Uint8ClampedArray(this.grid.size * 4);
        for (let row = 0; row < this.grid.height; row++) {
            for (let col = 0; col < this.grid.width; col++) {
                const sourceIndex = source.grid.getIndexForCenterArea(col, row);
                const targetIndex = this.grid.getIndex(col, row);
                let value = Math.round(source.image[sourceIndex] * 255);
                const pixelIndex = targetIndex * 4;
                imageData[pixelIndex] = value;     // R
                imageData[pixelIndex + 1] = value; // G
                imageData[pixelIndex + 2] = value; // B
                imageData[pixelIndex + 3] = 255; // A (opaque)
            }
        }
        return imageData;
    }

    private createImage(data: Float64Array): ImageDataArray {
        const imageData = new Uint8ClampedArray(this.grid.size * 4);
        for (let row = 0; row < this.grid.height; row++) {
            for (let col = 0; col < this.grid.width; col++) {
                const index = this.grid.getIndex(col, row);
                let value = data[index];
                this.drawPixel(imageData, index, (value == Number.MIN_SAFE_INTEGER) ? COLOR.WHITE : createGrey(value));
            }
        }
        return imageData;
    }

    private drawPixel(imageData: Uint8ClampedArray, index: number, color: RGB) {
        const pixelIndex = index * 4;
        imageData[pixelIndex] = color.r;     // R
        imageData[pixelIndex + 1] = color.g; // G
        imageData[pixelIndex + 2] = color.b; // B
        imageData[pixelIndex + 3] = 255;     // A (opaque)
    }
}