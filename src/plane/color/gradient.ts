import { InitializeAfterConstruct } from '../../../shared';
import { ModuleConfig, UiFieldFloat, UiFieldStringEnum } from '../../../shared/config';
import { GridRange } from '../../grid/grid-range';
import { ColorMapper, ColorMapperConfig, Easing } from '../../math/color/color-mapper';
import { COLORS } from '../../types/colors';
import { Plane, PlaneConfig } from '../plane';
import { UI_SCHEMA_HEADER_GRADIENT, uiSchemaGradientEasing, uiSchemaGradientScaling, uiSchemaGradientSupportPoints } from '../ui-schema/ui-fields';

enum GradientDemos {
    BW = 'BlackWhite',
    HOT_METAL = 'Hot Metal',
    RAINBOW = 'Rainbow',
    OCEAN = 'Ocean',
    FIRE = 'Fire',
    PURPLE_HAZE = 'Purple Haze',
    GREYSCALE = 'Grayscale',
    SUNSET = 'Sunset',
    ELECTRIC = 'Electric',
    PASTEL = 'Pastel',
    CAPPUCCINO = 'Cappuccino',
    C64_RAINBOW = 'C64 Rainbow',
    C64_MANDELBROT = 'C64 Mandelbrot',
    C64_ALL_COLORS = 'C64 All Colors',
}

interface GradientPlaneConfig extends PlaneConfig {
    demo: GradientDemos,
    config: ColorMapperConfig,
    offset: number,
};

const INITIAL_GRID_RANGE: GridRange = { xMin: 0, xMax: 10, yCenter: 0 };

@InitializeAfterConstruct()
export class Gradient extends Plane {

    override config: ModuleConfig<GradientPlaneConfig> = new ModuleConfig(
        {
            gridRange: INITIAL_GRID_RANGE,
            demo: GradientDemos.BW,
            config: {
                supportPoints: '',
                easing: Easing.LINEAR,
                scaling: 1,
            },
            offset: 0,
        },
        'gradientConfig',
        [
            UI_SCHEMA_HEADER_GRADIENT,
            new UiFieldStringEnum('demo', GradientDemos, 'Gradient Demos', 'Gradient Demos (selection of predefined definitions)'),
            uiSchemaGradientSupportPoints('config.supportPoints'),
            uiSchemaGradientEasing('config.easing'),
            uiSchemaGradientScaling('config.scaling'),
            new UiFieldFloat('offset', 'Offset', 'Gradient Offset (applied after scaling)', -10000, 10000),
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
        const colorMapper = this.getColorMapper();
        this.config.setInfo('Effective Gradient', colorMapper.supportPointsString);

        for (let row = 0; row < this.grid.height; row++) {
            for (let col = 0; col < this.grid.width; col++) {
                const [x, y] = this.grid.pixelToMath(col, row);
                const index = this.grid.getIndex(col, row);
                const color = colorMapper.map(x, 10 / this.mapYToScale(y) * this.config.data.config.scaling, this.config.data.offset);
                const pixelIndex = index * 4;
                imageData[pixelIndex] = color.r;
                imageData[pixelIndex + 1] = color.g;
                imageData[pixelIndex + 2] = color.b;
                imageData[pixelIndex + 3] = 255; // A (opaque)
            }
        }
        return imageData;
    }

    private getColorMapper(): ColorMapper {
        if (this.config.data.config.supportPoints.length > 0) {
            return ColorMapper.fromString(this.config.data.config.supportPoints, this.config.data.config.easing);
        }
        switch (this.config.data.demo) {
            case GradientDemos.BW: return ColorMapper.fromColors(COLORS.BW, this.config.data.config.easing);
            case GradientDemos.HOT_METAL: return ColorMapper.fromColors(COLORS.HOT_METAL, this.config.data.config.easing);
            case GradientDemos.RAINBOW: return ColorMapper.fromColors(COLORS.RAINBOW, this.config.data.config.easing);
            case GradientDemos.OCEAN: return ColorMapper.fromColors(COLORS.OCEAN, this.config.data.config.easing);
            case GradientDemos.FIRE: return ColorMapper.fromColors(COLORS.FIRE, this.config.data.config.easing);
            case GradientDemos.PURPLE_HAZE: return ColorMapper.fromColors(COLORS.PURPLE_HAZE, this.config.data.config.easing);
            case GradientDemos.GREYSCALE: return ColorMapper.fromColors(COLORS.GREYSCALE, this.config.data.config.easing);
            case GradientDemos.SUNSET: return ColorMapper.fromColors(COLORS.SUNSET, this.config.data.config.easing);
            case GradientDemos.ELECTRIC: return ColorMapper.fromColors(COLORS.ELECTRIC, this.config.data.config.easing);
            case GradientDemos.PASTEL: return ColorMapper.fromColors(COLORS.PASTEL, this.config.data.config.easing);
            case GradientDemos.CAPPUCCINO: return ColorMapper.fromColors(COLORS.CAPPUCCINO, this.config.data.config.easing);
            case GradientDemos.C64_RAINBOW: return ColorMapper.fromColors(COLORS.C64_RAINBOW, this.config.data.config.easing);
            case GradientDemos.C64_MANDELBROT: return ColorMapper.fromColors(COLORS.C64_MANDELBROT, this.config.data.config.easing);
            case GradientDemos.C64_ALL_COLORS: return ColorMapper.fromColors(COLORS.C64_ALL_COLORS, this.config.data.config.easing);
        }
    }

    private mapYToScale(y: number): number {
        return y > 0
            ? Math.floor(y + 0.5) + 1
            : 1 / (Math.floor(-y + 0.5) + 1);
    }
}