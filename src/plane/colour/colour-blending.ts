import { blender, BlendingType } from '../../../shared/colour/colour-blender';
import { ColourMapper, ColourMapperConfig, Easing } from '../../../shared/colour/colour-mapper';
import { ModuleConfig } from '../../../shared/config';
import { InitializeAfterConstruct } from '../../../shared/initializable';
import { GridRange } from '../../grid/grid-range';
import { BigDecimal } from '../../types/big-decimal';
import { Plane, PlaneConfig } from '../plane';
import { CREATE } from '../ui/plane-config-field-creator';

interface ColourBlendingPlaneConfig extends PlaneConfig {
    type: BlendingType,
    gradient1: ColourMapperConfig,
    gradient2: ColourMapperConfig,
};

const INITIAL_GRID_RANGE: GridRange = { xMin: BigDecimal.ZERO, xMax: BigDecimal.fromNumber(10), yCenter: BigDecimal.ZERO };

@InitializeAfterConstruct()
export class ColourBlending extends Plane {

    override config: ModuleConfig<ColourBlendingPlaneConfig> = new ModuleConfig(
        {
            gridRange: GridRange.serialize(INITIAL_GRID_RANGE),
            type: BlendingType.INTENSITY,
            gradient1: {
                supportPoints: '0:#FF0000, 0.25:#00FF00, 0.5:#0000FF, 0.75:#00FF00, 1:#FF0000',
                easing: Easing.RGB_LINEAR,
                scaling: 1,
            },
            gradient2: {
                supportPoints: '0:#FFFFFF, 0.25:#000000, 0.5:#FFFFFF, 0.5:#00FF00, 0.75:#FF0000, 1:#0000FF, 1:#FFFFFF',
                easing: Easing.RGB_LINEAR,
                scaling: 1,
            },
        },
        'colourBlendingConfig',
        [
            CREATE.UI_FIELD_HEADER_BLENDING,
            CREATE.uiFieldColourBlending('type'),
            CREATE.createHeader('Gradient 1'),
            CREATE.uiFieldGradientSupportPoints('gradient1.supportPoints'),
            CREATE.uiFieldGradientEasing('gradient1.easing'),
            CREATE.uiFieldGradientScaling('gradient1.scaling'),
            CREATE.createHeader('Gradient 2'),
            CREATE.uiFieldGradientSupportPoints('gradient2.supportPoints'),
            CREATE.uiFieldGradientEasing('gradient2.easing'),
            CREATE.uiFieldGradientScaling('gradient2.scaling'),
        ],
    );

    override refresh() {
        this.calculate();
    }

    private calculate() {
        this.updateImage(this.createImage());
    }

    private createImage(): ImageDataArray {
        const imageData = new Uint8ClampedArray(this.grid.size * 4);
        const colourMapper1 = ColourMapper.fromString(this.config.data.gradient1.supportPoints, this.config.data.gradient1.easing);
        const colourMapper2 = ColourMapper.fromString(this.config.data.gradient2.supportPoints, this.config.data.gradient2.easing);

        for (let row = 0; row < this.grid.height; row++) {
            for (let col = 0; col < this.grid.width; col++) {
                const [x, y] = this.grid.pixelToMath(col, row);
                const index = this.grid.getIndex(col, row);

                const colour1 = colourMapper1.mapLooped(x, 10);
                const colour2 = colourMapper2.mapLooped(x, 10);

                this.setPixel(
                    imageData,
                    index,
                    (y < -1 || y > 1) ?
                        blender.blend(colour1, colour2, this.config.data.type) :
                        (y > 0) ? colour1 : colour2
                );
            }
        }
        return imageData;
    }
}