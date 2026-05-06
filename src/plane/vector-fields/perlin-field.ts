import { lastValueFrom } from 'rxjs';
import { InitializeAfterConstruct } from '../../../shared';
import { ModuleConfig } from '../../../shared/config';
import { GridRange, GridRangeSerialized } from '../../grid/grid-range';
import { GridWithMargin } from '../../grid/grid-with-margin';
import { ColorMapper, ColorMapperConfig, Easing } from '../../math/color/color-mapper';
import { LicCalculator, SourceData } from '../../math/lic/lic-calculator';
import { LicConfig } from '../../math/lic/types';
import { NoiseConfig, NoiseGenerator, NoiseType } from '../../math/noise-generator/noise-generator';
import { PerlinGenerator } from '../../math/perlin/perlin-generator';
import { BigDecimal, COLOR } from '../../types';
import { extractData } from '../../worker/extract-data';
import { Plane, PlaneConfig } from '../plane';
import { CREATE } from '../ui/plane-config-field-creator';
import { VectorFieldReader } from '../../math/vector-field/vector-field-reader';
import { blender, BlendingType } from '../../math/color/color-blender';

interface PerlinFieldPlaneConfig extends PlaneConfig {
    scaleFactor: number,
    octaveCount: number,
    octaveAmplitudeFactor: number,
    noiseConfig: NoiseConfig,
    licConfig: LicConfig,
    gradientMagnitude: ColorMapperConfig,
    gradientStreamlines: ColorMapperConfig,
    blending: BlendingType,
}

const INITIAL_GRID_RANGE: GridRange = { xMin: BigDecimal.ZERO, xMax: BigDecimal.fromNumber(50), yCenter: BigDecimal.ZERO };

@InitializeAfterConstruct()
export class PerlinField extends Plane {

    override config: ModuleConfig<PerlinFieldPlaneConfig> = new ModuleConfig(
        {
            gridRange: GridRange.serialize(INITIAL_GRID_RANGE),
            scaleFactor: 1,
            octaveCount: 2,
            octaveAmplitudeFactor: 2,
            noiseConfig: {
                type: NoiseType.BERNOULLI_ISOLATED,
                p: 0.3,
                scaling: 2,
            },
            licConfig: {
                minLength: 3,
                maxLength: 30,
                strength: 15,
            },
            gradientMagnitude: {
                supportPoints: '0:#FFFFFF, 1:#FFFFFF',
                easing: Easing.LAB_LINEAR,
                scaling: 1,
            },
            gradientStreamlines: {
                supportPoints: '0:#FFFF00, 1:#FFFFFF',
                easing: Easing.RGB_LINEAR,
                scaling: 1,
            },
            blending: BlendingType.HSL,
        },
        'perlinField',
        [
            CREATE.createHeader('Perlin Noise'),
            CREATE.createFloatField('scaleFactor', 'Scale Factor', 'Scale Factor for Perlin Noise', 0.001, 1000),
            CREATE.createIntegerField('octaveCount', 'Octave Count', 'Number of additional octaves', 0, 8),
            CREATE.createFloatField('octaveAmplitudeFactor', 'Octave Amp. Factor', 'Factor of the octaves amplitudes', 0.1, 10),
            CREATE.UI_FIELD_HEADER_NOISE,
            CREATE.uiFieldNoiseType('noiseConfig.type'),
            CREATE.uiFieldNoiseP('noiseConfig.p'),
            CREATE.uiFieldNoiseScaling('noiseConfig.scaling'),
            CREATE.UI_FIELD_HEADER_LIC,
            CREATE.uiFieldLicMinLenth('licConfig.minLength'),
            CREATE.uiFieldLicMaxLenth('licConfig.maxLength'),
            CREATE.uiFieldLicStrength('licConfig.strength'),
            CREATE.createHeader('Magnitude', 'Gradient clamped'),
            CREATE.uiFieldGradientSupportPoints('gradientMagnitude.supportPoints'),
            CREATE.uiFieldGradientEasing('gradientMagnitude.easing'),
            CREATE.createHeader('Streamlines', 'Gradient clapmed'),
            CREATE.uiFieldGradientSupportPoints('gradientStreamlines.supportPoints'),
            CREATE.uiFieldGradientEasing('gradientStreamlines.easing'),
            CREATE.UI_FIELD_HEADER_BLENDING,
            CREATE.uiFieldColorBlending('blending'),
        ]
    );

    override refresh() {
        this.create();
    }

    private create() {
        this.grid.updateRange(GridRangeSerialized.deserialize(this.config.data.gridRange));
        this.createAndDraw();
    }

    private async createAndDraw() {
        this.setProgress(0);

        // Create Source Field
        const sourceGrid = new GridWithMargin(this.grid.resolution, GridRangeSerialized.deserialize(this.config.data.gridRange), 2 * this.config.data.licConfig.maxLength);
        const generator = new PerlinGenerator(sourceGrid);
        const fieldCalculation$ = generator.createField(
            this.config.data.scaleFactor,
            this.config.data.octaveCount,
            this.config.data.octaveAmplitudeFactor,
        );
        fieldCalculation$.subscribe({ next: (state) => { this.setProgress(state.progress, 'Perlin 1/2'); } });
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
        const calculation$ = calculator.calculate(this.config.data.licConfig);
        calculation$.subscribe({ next: (state) => { this.setProgress(state.progress, 'LIC 2/2'); } });
        const result = await lastValueFrom(calculation$);
        if (result.data != null) {
            this.updateImage(this.createImage(result.data, new VectorFieldReader(sourceGrid, sourceData.field)));
            this.setIdle();
        } else {
            console.error('#createAndDraw - calculation did not produce data');
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
        const fallbackColor = COLOR.RED;

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
