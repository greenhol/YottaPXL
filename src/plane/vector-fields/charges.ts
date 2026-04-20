import { lastValueFrom } from 'rxjs';
import { InitializeAfterConstruct } from '../../../shared';
import { ModuleConfig, UiFieldBool } from '../../../shared/config';
import { GridRange } from '../../grid/grid-range';
import { GridWithMargin } from '../../grid/grid-with-margin';
import { blender, BlendingType } from '../../math/color/color-blender';
import { ColorMapper, ColorMapperConfig, Easing } from '../../math/color/color-mapper';
import { LicCalculator, SourceData } from '../../math/lic/lic-calculator';
import { LicConfig } from '../../math/lic/types';
import { NoiseConfig, NoiseGenerator, NoiseType } from '../../math/noise-generator/noise-generator';
import { NoiseScaleFactor } from '../../math/noise-generator/types';
import { VectorFieldGenerator } from '../../math/vector-field/vector-field-generator';
import { VectorFieldReader } from '../../math/vector-field/vector-field-reader';
import { stringToRgb } from '../../types';
import { extractData } from '../../worker/extract-data';
import { Plane, PlaneConfig } from '../plane';
import { UI_SCHEMA_HEADER_BLENDING, UI_SCHEMA_HEADER_LIC, UI_SCHEMA_HEADER_NOISE, uiSchemaColorBlending, uiSchemaFallbackColor, uiSchemaGradientEasing, uiSchemaGradientScaling, uiSchemaGradientSupportPoints, uiSchemaHeader, uiSchemaLicMaxLenth, uiSchemaLicMinLenth, uiSchemaLicStrength, uiSchemaNoiseP, uiSchemaNoiseScaling, uiSchemaNoiseType } from '../ui-schema/ui-fields';
import { UI_SCHEMA_HEADER_FIELD } from './../ui-schema/ui-fields';

interface ChargesPlaneConfig extends PlaneConfig {
    potential: boolean,
    noiseConfig: NoiseConfig,
    licConfig: LicConfig,
    gradientMagnitude: ColorMapperConfig,
    gradientStreamlines: ColorMapperConfig,
    fallbackColor: string,
    blending: BlendingType,
}

const INITIAL_GRID_RANGE: GridRange = { xMin: 0, xMax: 10, yCenter: 0 };

@InitializeAfterConstruct()
export class Charges extends Plane {

    override config: ModuleConfig<ChargesPlaneConfig> = new ModuleConfig(
        {
            potential: true,
            gridRange: INITIAL_GRID_RANGE,
            noiseConfig: {
                type: NoiseType.BERNOULLI_ISOLATED_BIG,
                p: 0.05,
                scaling: NoiseScaleFactor.NONE,
            },
            licConfig: {
                minLength: 7.5,
                maxLength: 30,
                strength: 2.5,
            },
            gradientMagnitude: {
                supportPoints: '0:#0000FF, 0.05:#00FF00, 0.2:#FFFF00, 1:#FF0000',
                easing: Easing.LCH_LINEAR,
                scaling: 15,
            },
            gradientStreamlines: {
                supportPoints: '0:#FFFFFF, 1:#FFFF88',
                easing: Easing.RGB_LINEAR,
                scaling: 1,
            },
            fallbackColor: '#000000',
            blending: BlendingType.HSL,
        },
        'chargesConfig',
        [
            UI_SCHEMA_HEADER_FIELD,
            new UiFieldBool('potential', 'Potential', 'true: show pptential of electric field.\nfalse: standard electric field.'),
            UI_SCHEMA_HEADER_NOISE,
            uiSchemaNoiseType('noiseConfig.type'),
            uiSchemaNoiseP('noiseConfig.p'),
            uiSchemaNoiseScaling('noiseConfig.scaling'),
            UI_SCHEMA_HEADER_LIC,
            uiSchemaLicMinLenth('licConfig.minLength'),
            uiSchemaLicMaxLenth('licConfig.maxLength'),
            uiSchemaLicStrength('licConfig.strength'),
            uiSchemaHeader('Magnitude', 'Gradient clapmed'),
            uiSchemaGradientSupportPoints('gradientMagnitude.supportPoints'),
            uiSchemaGradientEasing('gradientMagnitude.easing'),
            uiSchemaGradientScaling('gradientMagnitude.scaling'),
            uiSchemaHeader('Streamlines', 'Gradient clapmed'),
            uiSchemaGradientSupportPoints('gradientStreamlines.supportPoints'),
            uiSchemaGradientEasing('gradientStreamlines.easing'),
            uiSchemaGradientScaling('gradientStreamlines.scaling'),
            uiSchemaFallbackColor('fallbackColor'),
            UI_SCHEMA_HEADER_BLENDING,
            uiSchemaColorBlending('blending'),
        ],
    );

    override refresh() {
        this.calculate();
    }

    private async calculate() {
        this.setProgress(0);

        // Create Source Field
        const sourceGrid = new GridWithMargin(this.grid.resolution, this.config.data.gridRange, 2 * this.config.data.licConfig.maxLength);
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
        const calculator: LicCalculator = new LicCalculator(sourceData, this.grid, this.config.data.potential);
        const calculation$ = calculator.calculate(this.config.data.licConfig);
        calculation$.subscribe({ next: (state) => { this.setProgress(state.progress, 'LIC 2/2'); } });
        const result = await lastValueFrom(calculation$);
        if (result.data != null) {
            this.updateImage(this.createImage(result.data, new VectorFieldReader(sourceGrid, field)));
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

    private createImage(data: Float64Array, vectorField: VectorFieldReader): ImageDataArray {
        const medianMagnitude = vectorField.evaluateMedianMagnitude();
        const imageData = new Uint8ClampedArray(this.grid.size * 4);
        const colorMapperMagnitude = ColorMapper.fromString(this.config.data.gradientMagnitude.supportPoints, this.config.data.gradientMagnitude.easing);
        const colorMapperStreamlines = ColorMapper.fromString(this.config.data.gradientStreamlines.supportPoints, this.config.data.gradientStreamlines.easing);
        const fallbackColor = stringToRgb(this.config.data.fallbackColor);

        for (let row = 0; row < this.grid.height; row++) {
            for (let col = 0; col < this.grid.width; col++) {
                const index = this.grid.getIndex(col, row);
                const magnitude = vectorField.getMagnitude(col, row);
                this.setPixel(
                    imageData,
                    index,
                    blender.blend(
                        (isNaN(magnitude)) ? fallbackColor : colorMapperMagnitude.mapClamped(magnitude, medianMagnitude * this.config.data.gradientMagnitude.scaling),
                        (isNaN(data[index])) ? fallbackColor : colorMapperStreamlines.mapClamped(data[index], this.config.data.gradientStreamlines.scaling),
                        this.config.data.blending,
                    ),
                );
            }
        }
        return imageData;
    }
}