import { InitializeAfterConstruct } from '../../../shared';
import { ModuleConfig } from '../../../shared/config';
import { GridRange } from '../../grid/grid-range';
import { blender, BlendingType } from '../../math/color/color-blender';
import { ColorMapper, ColorMapperConfig, Easing } from '../../math/color/color-mapper';
import { Plane, PlaneConfig } from '../plane';
import { UI_SCHEMA_HEADER_COLORS, uiSchemaColorBlending, uiSchemaGradientEasing, uiSchemaGradientScaling, uiSchemaGradientSupportPoints, uiSchemaHeader } from '../ui-schema/ui-fields';

interface ColorBlendingPlaneConfig extends PlaneConfig {
    type: BlendingType,
    gradient1: ColorMapperConfig,
    gradient2: ColorMapperConfig,
};

const INITIAL_GRID_RANGE: GridRange = { xMin: 0, xMax: 10, yCenter: 0 };

@InitializeAfterConstruct()
export class ColorBlending extends Plane {

    override config: ModuleConfig<ColorBlendingPlaneConfig> = new ModuleConfig(
        {
            gridRange: INITIAL_GRID_RANGE,
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
            UI_SCHEMA_HEADER_COLORS,
            uiSchemaColorBlending('type'),
            uiSchemaHeader('Gradient 1'),
            uiSchemaGradientSupportPoints('gradient1.supportPoints'),
            uiSchemaGradientEasing('gradient1.easing'),
            uiSchemaGradientScaling('gradient1.scaling'),
            uiSchemaHeader('Gradient 2'),
            uiSchemaGradientSupportPoints('gradient2.supportPoints'),
            uiSchemaGradientEasing('gradient2.easing'),
            uiSchemaGradientScaling('gradient2.scaling'),
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

                const color1 = colorMapper1.map(x, 10);
                const color2 = colorMapper2.map(x, 10);
                const color = (y < -1 || y > 1) ?
                    blender.blend(color1, color2, this.config.data.type) :
                    (y > 0) ? color1 : color2;

                const pixelIndex = index * 4;
                imageData[pixelIndex] = color.r;
                imageData[pixelIndex + 1] = color.g;
                imageData[pixelIndex + 2] = color.b;
                imageData[pixelIndex + 3] = 255; // A (opaque)
            }
        }
        return imageData;
    }
}