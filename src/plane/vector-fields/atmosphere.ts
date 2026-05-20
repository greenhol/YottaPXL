import { lastValueFrom } from 'rxjs';
import { InitializeAfterConstruct } from '../../../shared';
import { ModuleConfig } from '../../../shared/config';
import { Grid } from '../../grid/grid';
import { GridRange, GridRangeSerialized } from '../../grid/grid-range';
import { GridWithMargin } from '../../grid/grid-with-margin';
import { blender, BlendingType } from '../../math/color/color-blender';
import { ColorMapper, ColorMapperConfig, Easing } from '../../math/color/color-mapper';
import { LicCalculator, SourceData } from '../../math/lic/lic-calculator';
import { LicConfig } from '../../math/lic/types';
import { NoiseConfig, NoiseGenerator, NoiseType } from '../../math/noise-generator/noise-generator';
import { VectorFieldGenerator } from '../../math/vector-field/vector-field-generator';
import { VectorFieldReader } from '../../math/vector-field/vector-field-reader';
import { BigDecimal, COLOR } from '../../types';
import { extractData } from '../../worker/extract-data';
import { Plane, PlaneConfig } from '../plane';
import { CREATE } from '../ui/plane-config-field-creator';
import { createAtmosphereDescriptor } from './create-atmosphere-descriptor';
import { createAtmosphereColorSeeds } from './create-atmosphere-seeds';

enum AtmosphereRender {
    FIELD = 'Field',
    COLORS = 'Colors',
    COMBINED = 'Colored Field',
}

interface AtmosphereConfig extends PlaneConfig {
    render: AtmosphereRender,
    fieldSeed: number | null,
    bandGradient: ColorMapperConfig,
    noiseConfig: NoiseConfig,
    licConfig: LicConfig,
}

const INITIAL_GRID_RANGE: GridRange = { xMin: BigDecimal.fromNumber(-180), xMax: BigDecimal.fromNumber(180), yCenter: BigDecimal.ZERO };

@InitializeAfterConstruct()
export class Atmosphere extends Plane {

    constructor(grid: Grid) {
        super(grid);
    }

    override config: ModuleConfig<AtmosphereConfig> = new ModuleConfig(
        {
            gridRange: GridRange.serialize(INITIAL_GRID_RANGE),
            render: AtmosphereRender.FIELD,
            fieldSeed: null,
            bandGradient: {
                supportPoints: '0.0:#F0E4C8, 0.1:#F0E4C8, 0.2:#C8A882, 0.4:#8B5E3C, 0.6:#D4A96A, 0.8:#A0704A, 0.9:#F0E4C8, 1.0:#F0E4C8',
                easing: Easing.RGB_LINEAR,
                scaling: 1,
            },
            noiseConfig: {
                seed: null,
                type: NoiseType.BERNOULLI_ISOLATED_BIG,
                p: 0.05,
                scaling: 1,
            },
            licConfig: {
                minLength: 5,
                maxLength: 30,
                strength: 15,
            },
        },
        'atmosphereConfig',
        [
            CREATE.createEnumField('render', AtmosphereRender, 'Render', 'Render Field, Coloring or both combined'),
            CREATE.uiFieldSeed('fieldSeed', 'Field'),
            CREATE.uiFieldGradientSupportPoints('bandGradient.supportPoints'),
            CREATE.uiFieldGradientEasing('bandGradient.easing'),
            CREATE.UI_FIELD_HEADER_NOISE,
            CREATE.uiFieldSeed('noiseConfig.seed', 'Noise'),
            CREATE.uiFieldNoiseType('noiseConfig.type'),
            CREATE.uiFieldNoiseP('noiseConfig.p'),
            CREATE.uiFieldNoiseScaling('noiseConfig.scaling'),
            CREATE.UI_FIELD_HEADER_LIC,
            CREATE.uiFieldLicMinLenth('licConfig.minLength'),
            CREATE.uiFieldLicMaxLenth('licConfig.maxLength'),
            CREATE.uiFieldLicStrength('licConfig.strength'),
        ],
    );

    override refresh() {
        switch (this.config.data.render) {
            case AtmosphereRender.FIELD: this.calculateField(); break;
            case AtmosphereRender.COLORS: this.calculateColors(); break;
            case AtmosphereRender.COMBINED: this.calculateCombined(); break;
        }
    }

    private async calculateField() {
        this.resetProgress();
        const sourceGrid = new GridWithMargin(this.grid.resolution, GridRangeSerialized.deserialize(this.config.data.gridRange), 2 * this.config.data.licConfig.maxLength);

        // Create Source Field
        const fieldGenerator = new VectorFieldGenerator(sourceGrid);
        const fieldCalculation$ = fieldGenerator.createAtmosphereField(createAtmosphereDescriptor(this.config.data.fieldSeed, this.config.data.bandGradient));
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
        this.updateImage(this.createNoiseImage(sourceData));

        // LIC
        const calculator: LicCalculator = new LicCalculator(sourceData, this.grid);
        const calculation$ = calculator.calculate(this.config.data.licConfig);
        calculation$.subscribe({ next: (state) => { this.setProgress(state.progress, 'LIC 2/2'); } });
        const result = await lastValueFrom(calculation$);
        if (result.data != null) {
            this.updateImage(this.createFieldImage(result.data, new VectorFieldReader(sourceGrid, field)));
            this.setIdle();
        } else {
            console.error('#calculateAndDraw - calculation did not produce data');
        }
    }

    private async calculateColors() {
        this.resetProgress();
        const sourceGrid = new GridWithMargin(this.grid.resolution, GridRangeSerialized.deserialize(this.config.data.gridRange), 0);
        const descriptor = createAtmosphereDescriptor(this.config.data.fieldSeed, this.config.data.bandGradient);

        // Create Source Field
        const fieldGenerator = new VectorFieldGenerator(sourceGrid);
        const fieldCalculation$ = fieldGenerator.createAtmosphereField(descriptor);
        fieldCalculation$.subscribe({ next: (state) => { this.setProgress(state.progress, 'Source Field 1/2'); } });
        const field = await extractData(fieldCalculation$, '');

        // Create Color Image
        const colorCalculation$ = fieldGenerator.createAdvectionColor(field, createAtmosphereColorSeeds(descriptor, 120, 90, 0));
        colorCalculation$.subscribe({ next: (state) => { this.setProgress(state.progress, 'Color 2/2'); } });
        const colors = await extractData(colorCalculation$, '');
        this.updateImage(this.createColorImage(colors, sourceGrid));
        this.setIdle();
    }

    private async calculateCombined() {
        this.resetProgress();
        const sourceGrid = new GridWithMargin(this.grid.resolution, GridRangeSerialized.deserialize(this.config.data.gridRange), 2 * this.config.data.licConfig.maxLength);
        const descriptor = createAtmosphereDescriptor(this.config.data.fieldSeed, this.config.data.bandGradient);

        // Create Source Field
        const fieldGenerator = new VectorFieldGenerator(sourceGrid);
        const fieldCalculation$ = fieldGenerator.createAtmosphereField(descriptor);
        fieldCalculation$.subscribe({ next: (state) => { this.setProgress(state.progress, 'Source Field 1/3'); } });
        const field = await extractData(fieldCalculation$, '');

        // Create Color Image
        const colorCalculation$ = fieldGenerator.createAdvectionColor(field, createAtmosphereColorSeeds(descriptor, 120, 90, 0));
        colorCalculation$.subscribe({ next: (state) => { this.setProgress(state.progress, 'Color 2/3'); } });
        const colors = await extractData(colorCalculation$, '');
        this.updateImage(this.createColorImage(colors, sourceGrid));

        // Create Source Noise
        const noiseGenerator = new NoiseGenerator(sourceGrid);
        const generator$ = noiseGenerator.createNoise(this.config.data.noiseConfig);
        const noise = await extractData(generator$, 'noise');

        // Draw Source Image
        const sourceData: SourceData = {
            grid: sourceGrid,
            image: noise,
            field: field,
        };

        // LIC
        const calculator: LicCalculator = new LicCalculator(sourceData, this.grid);
        const calculation$ = calculator.calculate(this.config.data.licConfig);
        calculation$.subscribe({ next: (state) => { this.setProgress(state.progress, 'LIC 3/3'); } });
        const result = await lastValueFrom(calculation$);
        if (result.data != null) {
            this.updateImage(this.createCombinedImage(result.data, colors, sourceGrid));
            this.setIdle();
        } else {
            console.error('#calculateAndDraw - calculation did not produce data');
        }
    }

    private createNoiseImage(source: SourceData): ImageDataArray {
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

    private createFieldImage(data: Float64Array, vectorField: VectorFieldReader): ImageDataArray {
        const imageData = new Uint8ClampedArray(this.grid.size * 4);
        const colorMapperMagnitude = ColorMapper.fromString('0:#FFF, 0:#FFF');
        const colorMapperStreamlines = ColorMapper.fromString('0:#FF0, 1:#FFF');
        const fallbackColor = COLOR.RED;

        for (let row = 0; row < this.grid.height; row++) {
            for (let col = 0; col < this.grid.width; col++) {
                const index = this.grid.getIndex(col, row);
                const magnitude = vectorField.getMagnitude(col, row);
                this.setPixel(
                    imageData,
                    index,
                    blender.blend(
                        (isNaN(magnitude)) ? fallbackColor : colorMapperMagnitude.mapClamped(magnitude),
                        // colorMapperStreamlines.mapClamped((data[index] - licMin) / licDiff),
                        colorMapperStreamlines.mapClamped(data[index]),
                        BlendingType.HSL,
                    ),
                );
            }
        }
        return imageData;
    }

    private createColorImage(data: Uint8ClampedArray, sourceGrid: GridWithMargin): ImageDataArray {
        const imageData = new Uint8ClampedArray(this.grid.size * 4);

        for (let row = 0; row < this.grid.height; row++) {
            for (let col = 0; col < this.grid.width; col++) {
                const indexSource = sourceGrid.getIndexForCenterArea(col, row);
                const pixelIndexSource = indexSource * 4;
                const indexDestination = this.grid.getIndex(col, row);
                const pixelIndexDestination = indexDestination * 4;
                imageData[pixelIndexDestination] = data[pixelIndexSource];     // R
                imageData[pixelIndexDestination + 1] = data[pixelIndexSource + 1]; // G
                imageData[pixelIndexDestination + 2] = data[pixelIndexSource + 2]; // B
                imageData[pixelIndexDestination + 3] = data[pixelIndexSource + 3]; // A
            }
        }
        return imageData;
    }

    private createCombinedImage(
        licData: Float64Array,
        colors: Uint8ClampedArray,
        sourceGridForField: GridWithMargin,
    ): ImageDataArray {
        const imageData = new Uint8ClampedArray(this.grid.size * 4);
        const colorMapperStreamlines = ColorMapper.fromString('0:#FF0, 1:#FFF');

        for (let row = 0; row < this.grid.height; row++) {
            for (let col = 0; col < this.grid.width; col++) {
                const indexSource = sourceGridForField.getIndexForCenterArea(col, row);
                const indexDestination = this.grid.getIndex(col, row);
                const pixelIndexSource = indexSource * 4;

                this.setPixel(
                    imageData,
                    indexDestination,
                    blender.blend(
                        { r: colors[pixelIndexSource], g: colors[pixelIndexSource + 1], b: colors[pixelIndexSource + 2] },
                        colorMapperStreamlines.mapClamped(licData[indexDestination]),
                        BlendingType.HSL,
                    ),
                );
            }
        }
        return imageData;
    }
}
