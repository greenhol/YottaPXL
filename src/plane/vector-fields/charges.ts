import { lastValueFrom } from 'rxjs';
import { InitializeAfterConstruct } from '../../../shared';
import { ModuleConfig } from '../../../shared/config';
import { GridRange } from '../../grid/grid-range';
import { GridWithMargin } from '../../grid/grid-with-margin';
import { LicCalculator, SourceData } from '../../math/lic/lic-calculator';
import { NoiseConfig, NoiseGenerator, NoiseType } from '../../math/noise-generator/noise-generator';
import { NoiseScaleFactor } from '../../math/noise-generator/types';
import { VectorFieldGenerator } from '../../math/vector-field/vector-field-generator';
import { COLOR, Color, createGrey } from '../../types';
import { extractData } from '../../worker/extract-data';
import { Plane, PlaneConfig } from '../plane';
import { UI_SCHEMA_HEADER_LIC, UI_SCHEMA_HEADER_NOISE, uiSchemaLicLenth, uiSchemaNoiseP, uiSchemaNoiseScaling, uiSchemaNoiseType } from '../ui-schema/ui-fields';

interface ChargesPlaneConfig extends PlaneConfig {
    noiseConfig: NoiseConfig,
    licLength: number,
}

const INITIAL_GRID_RANGE: GridRange = { xMin: 0, xMax: 10, yCenter: 0 };

@InitializeAfterConstruct()
export class Charges extends Plane {

    override config: ModuleConfig<ChargesPlaneConfig> = new ModuleConfig(
        {
            gridRange: INITIAL_GRID_RANGE,
            noiseConfig: {
                type: NoiseType.BIASED_UPPER,
                p: 0.5,
                scaling: NoiseScaleFactor.NONE,
            },
            licLength: 10,
        },
        'chargesConfig',
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
        const fieldCalculation$ = fieldGenerator.createChargeField([
            { x: 3, y: -1, charge: 5 },
            { x: 5.5, y: -0.5, charge: -10 },
            { x: 7, y: 2, charge: 3 },
        ]);
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
        const calculator: LicCalculator = new LicCalculator(sourceData, this.grid, true);
        const calculation$ = calculator.calculate(this.config.data.licLength);
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

    private drawPixel(imageData: Uint8ClampedArray, index: number, color: Color) {
        const pixelIndex = index * 4;
        imageData[pixelIndex] = color.r;     // R
        imageData[pixelIndex + 1] = color.g; // G
        imageData[pixelIndex + 2] = color.b; // B
        imageData[pixelIndex + 3] = 255;     // A (opaque)
    }
}