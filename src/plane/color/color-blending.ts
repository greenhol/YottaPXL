import { InitializeAfterConstruct } from '../../../shared';
import { ModuleConfig } from '../../../shared/config';
import { GridRange, gridRangeToJson } from '../../grid/grid-range';
import { blender, BlendingType } from '../../math/color/color-blender';
import { ColorMapper, ColorMapperConfig, Easing } from '../../math/color/color-mapper';
import { BigDecimal } from '../../types';
import { Plane, PlaneConfig } from '../plane';
import { CREATE } from '../ui/plane-config-field-creator';

interface ColorBlendingPlaneConfig extends PlaneConfig {
    type: BlendingType,
    gradient1: ColorMapperConfig,
    gradient2: ColorMapperConfig,
};

const INITIAL_GRID_RANGE: GridRange = { xMin: BigDecimal.ZERO, xMax: BigDecimal.fromNumber(10), yCenter: BigDecimal.ZERO };

@InitializeAfterConstruct()
export class ColorBlending extends Plane {

    override config: ModuleConfig<ColorBlendingPlaneConfig> = new ModuleConfig(
        {
            gridRange: gridRangeToJson(INITIAL_GRID_RANGE),
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
        'colorBlendingConfig',
        [
            CREATE.UI_FIELD_HEADER_BLENDING,
            CREATE.uiFieldColorBlending('type'),
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
        const colorMapper1 = ColorMapper.fromString(this.config.data.gradient1.supportPoints, this.config.data.gradient1.easing);
        const colorMapper2 = ColorMapper.fromString(this.config.data.gradient2.supportPoints, this.config.data.gradient2.easing);

        for (let row = 0; row < this.grid.height; row++) {
            for (let col = 0; col < this.grid.width; col++) {
                const [x, y] = this.grid.pixelToMath(col, row);
                const index = this.grid.getIndex(col, row);

                const color1 = colorMapper1.mapLooped(x, 10);
                const color2 = colorMapper2.mapLooped(x, 10);

                this.setPixel(
                    imageData,
                    index,
                    (y < -1 || y > 1) ?
                        blender.blend(color1, color2, this.config.data.type) :
                        (y > 0) ? color1 : color2
                );
            }
        }
        return imageData;
    }
}