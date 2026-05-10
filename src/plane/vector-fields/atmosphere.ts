import { lastValueFrom } from 'rxjs';
import { InitializeAfterConstruct } from '../../../shared';
import { ModuleConfig } from '../../../shared/config';
import { Grid } from '../../grid/grid';
import { GridRange, GridRangeSerialized } from '../../grid/grid-range';
import { GridWithMargin } from '../../grid/grid-with-margin';
import { blender, BlendingType } from '../../math/color/color-blender';
import { ColorMapper } from '../../math/color/color-mapper';
import { LicCalculator, SourceData } from '../../math/lic/lic-calculator';
import { LicConfig } from '../../math/lic/types';
import { NoiseConfig, NoiseGenerator, NoiseType } from '../../math/noise-generator/noise-generator';
import { VectorFieldGenerator } from '../../math/vector-field/vector-field-generator';
import { VectorFieldReader } from '../../math/vector-field/vector-field-reader';
import { BigDecimal, COLOR } from '../../types';
import { extractData } from '../../worker/extract-data';
import { Plane, PlaneConfig } from '../plane';
import { CREATE } from '../ui/plane-config-field-creator';

interface AtmosphereConfig extends PlaneConfig {
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
            CREATE.UI_FIELD_HEADER_NOISE,
            CREATE.uiFieldSeed('noiseConfig.seed'),
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
        this.calculate();
    }

    private async calculate() {
        this.setProgress(0);
        const sourceGrid = new GridWithMargin(this.grid.resolution, GridRangeSerialized.deserialize(this.config.data.gridRange), 2 * this.config.data.licConfig.maxLength);

        // Create Source Field
        const fieldGenerator = new VectorFieldGenerator(sourceGrid);
        const fieldCalculation$ = fieldGenerator.createAtmosphereField();
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
        const imageData = new Uint8ClampedArray(this.grid.size * 4);
        const colorMapperMagnitude = ColorMapper.fromString('0:#FFF, 0:#FFF');
        const colorMapperStreamlines = ColorMapper.fromString('0:#FF0, 1:#FFF');
        const fallbackColor = COLOR.RED;
        // console.log('XXXXXXXXXXXXXXXXXX min', vectorField.evaluateMinMagnitude());
        // console.log('XXXXXXXXXXXXXXXXXX max', vectorField.evaluateMaxMagnitude());
        // console.log('XXXXXXXXXXXXXXXXXX mean', vectorField.evaluateMeanMagnitude());
        // console.log('XXXXXXXXXXXXXXXXXX median', vectorField.evaluateMedianMagnitude());

        // let licMin = Number.MAX_VALUE;
        // let licMax = Number.MIN_VALUE;
        // data.forEach((value) => {
        //     if (licMin > value) licMin = value;
        //     if (licMax < value) licMax = value;
        // });
        // const licDiff = licMax - licMin;
        // console.log('XXXXXXXXXXXXXXXXXX licMin', licMin);
        // console.log('XXXXXXXXXXXXXXXXXX licMax', licMax);
        // console.log('XXXXXXXXXXXXXXXXXX licDiff', licDiff);

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
}