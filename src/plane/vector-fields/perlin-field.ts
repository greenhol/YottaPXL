import { lastValueFrom } from 'rxjs';
import { InitializeAfterConstruct } from '../../../shared';
import { ModuleConfig } from '../../../shared/config';
import { GridRange, GridRangeSerialized } from '../../grid/grid-range';
import { GridWithMargin } from '../../grid/grid-with-margin';
import { blender, BlendingType } from '../../math/color/color-blender';
import { ColorMapper, ColorMapperConfig, Easing } from '../../math/color/color-mapper';
import { LicCalculator, SourceData } from '../../math/lic/lic-calculator';
import { LicConfig } from '../../math/lic/types';
import { NoiseConfig, NoiseGenerator, NoiseType } from '../../math/noise-generator/noise-generator';
import { PerlinGenerator } from '../../math/perlin/perlin-generator';
import { VectorFieldGenerator } from '../../math/vector-field/vector-field-generator';
import { VectorFieldReader } from '../../math/vector-field/vector-field-reader';
import { BigDecimal, COLOR } from '../../types';
import { extractData } from '../../worker/extract-data';
import { Plane, PlaneConfig } from '../plane';
import { CREATE } from '../ui/plane-config-field-creator';

interface PerlinFieldPlaneConfig extends PlaneConfig {
    scaleFactor: number,
    octaveCount: number,
    octaveAmplitudeFactor: number,
    isohypse: boolean,
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
            octaveCount: 4,
            octaveAmplitudeFactor: 2,
            isohypse: true,
            noiseConfig: {
                type: NoiseType.BERNOULLI_ISOLATED_BIG,
                p: 0.1,
                scaling: 1,
            },
            licConfig: {
                minLength: 3,
                maxLength: 10,
                strength: -1,
            },
            gradientMagnitude: {
                supportPoints: '0:#FFFFFF, 0.5:#888888, 1:#FFFFFF',
                easing: Easing.RGB_LINEAR,
                scaling: 5,
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
            CREATE.createBoolField('isohypse', 'Isohypse', 'Compute Isohypse from noise data'),
            CREATE.UI_FIELD_HEADER_NOISE,
            CREATE.uiFieldNoiseType('noiseConfig.type'),
            CREATE.uiFieldNoiseP('noiseConfig.p'),
            CREATE.uiFieldNoiseScaling('noiseConfig.scaling'),
            CREATE.UI_FIELD_HEADER_LIC,
            CREATE.uiFieldLicMinLenth('licConfig.minLength'),
            CREATE.uiFieldLicMaxLenth('licConfig.maxLength'),
            CREATE.uiFieldLicStrength('licConfig.strength'),
            CREATE.createHeader('Magnitude', 'Gradient looped'),
            CREATE.uiFieldGradientSupportPoints('gradientMagnitude.supportPoints'),
            CREATE.uiFieldGradientEasing('gradientMagnitude.easing'),
            CREATE.uiFieldGradientScaling('gradientMagnitude.scaling'),
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
        const field: Float32Array = await (this.config.data.isohypse ? this.calculateIsohypseVectorField(generator, sourceGrid) : this.calculateVectorField(generator));

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

    private async calculateVectorField(generator: PerlinGenerator): Promise<Float32Array> {
        const fieldCalculation$ = generator.createField(
            this.config.data.scaleFactor,
            this.config.data.octaveCount,
            this.config.data.octaveAmplitudeFactor,
        );
        fieldCalculation$.subscribe({ next: (state) => { this.setProgress(state.progress, 'Perlin 1/2'); } });
        return await extractData(fieldCalculation$, 'perlin field');
    }

    private async calculateIsohypseVectorField(generator: PerlinGenerator, grid: GridWithMargin): Promise<Float32Array> {
        const noiseCalculation$ = generator.createNoise(
            this.config.data.scaleFactor,
            this.config.data.octaveCount,
            this.config.data.octaveAmplitudeFactor,
        );
        noiseCalculation$.subscribe({ next: (state) => { this.setProgress(state.progress, 'Perlin 1/2'); } });
        const perlinNoise = await extractData(noiseCalculation$, 'perlin field 1/2');

        const fieldGenerator = new VectorFieldGenerator(grid);
        const fieldCalculation$ = fieldGenerator.createMatrixGradientField(perlinNoise, 0, 1);
        fieldCalculation$.subscribe({ next: (state) => { this.setProgress(state.progress, 'Perlin 1/2'); } });
        return await extractData(fieldCalculation$, 'perlin field 2/2');
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
                        (isNaN(magnitude)) ? fallbackColor : colorMapperMagnitude.mapLooped(magnitude, medianMagnitude * this.config.data.gradientMagnitude.scaling),
                        (isNaN(data[index])) ? fallbackColor : colorMapperStreamlines.mapClamped(data[index], this.config.data.gradientStreamlines.scaling),
                        this.config.data.blending,
                    ),
                );
            }
        }
        return imageData;
    }
}
