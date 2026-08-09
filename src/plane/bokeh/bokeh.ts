import { lastValueFrom } from 'rxjs';
import { ModuleConfig } from '../../../shared/config';
import { InitializeAfterConstruct } from '../../../shared/initializable';
import { Grid } from '../../grid/grid';
import { GridRange, GridRangeSerialized } from '../../grid/grid-range';
import { BokehProcessor } from '../../math/bokeh/bokeh-processor';
import { BokehConfig, BokehType } from '../../math/bokeh/types';
import { BigDecimal } from '../../types/big-decimal';
import { Plane, PlaneConfig } from '../plane';
import { CREATE } from '../ui/plane-config-field-creator';
import { DotDistributionType, DotGenerator, DotGeneratorConfig } from './dot-generator';
import { DotRasterizer } from './dot-rasterizer';

interface BokehPlaneConfig extends PlaneConfig {
    distribution: DotDistributionType,
    seed: number | null;
    dotCount: number;
    maxRadius: number;
    zOffset: number;
    bokehConfig: BokehConfig,
}

const INITIAL_GRID_RANGE: GridRange = { xMin: BigDecimal.ZERO, xMax: BigDecimal.fromNumber(10), yCenter: BigDecimal.ZERO };

@InitializeAfterConstruct()
export class Bokeh extends Plane {

    private _dotGenerator: DotGenerator;
    private _dotRasterizer: DotRasterizer;

    constructor(grid: Grid) {
        super(grid);
        this._dotGenerator = new DotGenerator();
        this._dotRasterizer = new DotRasterizer();
    }

    override config: ModuleConfig<BokehPlaneConfig> = new ModuleConfig(
        {
            gridRange: GridRange.serialize(INITIAL_GRID_RANGE),
            distribution: DotDistributionType.RANDOM_EVENLY,
            seed: null,
            dotCount: 30,
            maxRadius: 1,
            zOffset: 5,
            bokehConfig: {
                type: BokehType.SOFT_DISC,
                maxBlurRadius: 30,
                pixelsPerZUnit: 6,
                focusZ: 0,
                edgeSoftnessPx: 1,
                bladeCount: 5,
                apertureRotation: 0,
                innerRadiusRatio: 0.6,
                rimIntensity: 3,
            }
        },
        'bokeh',
        [
            CREATE.createHeader('Dot Distribution'),
            CREATE.createEnumField('distribution', DotDistributionType, 'Type'),
            CREATE.uiFieldSeed('seed', 'Dot Distribution'),
            CREATE.createIntegerField('dotCount', 'Count', undefined, 1, 500),
            CREATE.createFloatField('maxRadius', 'Max. Radius', undefined, 0.1, 10),
            CREATE.createFloatField('zOffset', 'Z Offset', '± Z Range around 0', 0.1, 10),
            CREATE.UI_FIELD_HEADER_BOKEH,
            CREATE.createEnumField('bokehConfig.type', BokehType, 'Type'),
            CREATE.createFloatField('bokehConfig.maxBlurRadius', 'Max Blur Radius', undefined, 0, 100),
            CREATE.createFloatField('bokehConfig.pixelsPerZUnit', 'Pixels per Z Unit', undefined, 0.1, 100),
            CREATE.createFloatField('bokehConfig.focusZ', 'Focus Z', 'Ideally inbetween ± Z Offset'),
            CREATE.createFloatField('bokehConfig.edgeSoftnessPx', 'Edge Softness', 'Edge Softness in Pixels', 0.1, 100),
            CREATE.createIntegerField('bokehConfig.bladeCount', 'Plade Count', 'For type Polygon only', 3, 12),
            CREATE.createFloatField('bokehConfig.apertureRotation', 'Aperture Rotation', 'For type Polygon only', 0, 360),
            CREATE.createFloatField('bokehConfig.innerRadiusRatio', 'Inner Radius Ratio', 'For type Ring only', 0, 1),
            CREATE.createFloatField('bokehConfig.rimIntensity', 'Rim Intensity', 'For type Bright Rim only', 1, 10),
        ]
    );

    override refresh() {
        this.createAndDraw();
    }

    private async createAndDraw() {
        // Create and draw source dots
        this.grid.updateRange(GridRangeSerialized.deserialize(this.config.data.gridRange));
        const rangeXdiff = GridRange.rangeXdiff(INITIAL_GRID_RANGE).toNumber();
        const dotGeneratorConfig: DotGeneratorConfig = {
            type: this.config.data.distribution,
            seed: this.config.data.seed,
            xMin: INITIAL_GRID_RANGE.xMin.toNumber(),
            xMax: INITIAL_GRID_RANGE.xMax.toNumber(),
            yMin: -rangeXdiff * 0.33,
            yMax: rangeXdiff * 0.33,
            count: this.config.data.dotCount,
            minRadius: 0.1,
            maxRadius: this.config.data.maxRadius,
            zMin: -this.config.data.zOffset,
            zMax: this.config.data.zOffset,
        };

        const dots = this._dotGenerator.generate(dotGeneratorConfig);
        const rasterizedDots = this._dotRasterizer.rasterize(dots, this.grid);
        const drawImage = structuredClone(rasterizedDots.colourData as ImageDataArray);
        this.updateImage(drawImage);

        // Bokeh
        const processor = new BokehProcessor();
        const calculation$ = processor.process({
            grid: this.grid,
            colourData: rasterizedDots.colourData,
            zData: rasterizedDots.zData,
            coverageData: rasterizedDots.coverageData,
        }, this.config.data.bokehConfig);
        calculation$.subscribe({ next: (state) => { this.setProgress(state.progress, 'Bokeh'); } });
        const result = await lastValueFrom(calculation$);
        if (result.data != null) {
            this.updateImage(result.data as ImageDataArray);
            this.setIdle();
        } else {
            console.error('#calculateAndDraw - calculation did not produce data');
        }
    }
}
