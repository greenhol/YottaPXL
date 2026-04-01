import { InitializeAfterConstruct } from '../../../shared';
import { ModuleConfig, UiFieldBool, UiFieldFloat, UiFieldString, UiFieldStringEnum } from '../../../shared/config';
import { GridRange } from '../../grid/grid-range';
import { ColorMapper } from '../../math/color-mapper/color-mapper';
import { COLORS } from '../../types/colors';
import { Plane, PlaneConfig } from '../plane';

enum GradientType {
    CUSTOM = 'Custom',
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
    C64_RAINBOW = 'C64 Rainbow',
    C64_MANDELBROT = 'C64 Mandelbrot',
    C64_ALL_COLORS = 'C64 All Colors',
}

interface GradientConfig extends PlaneConfig {
    type: GradientType,
    easing: boolean,
    easingFactor: number,
    scaling: number,
    offset: number,
    custom: string,
};

const INITIAL_GRID_RANGE: GridRange = { xMin: 0, xMax: 10, yCenter: 0 };

@InitializeAfterConstruct()
export class Gradient extends Plane {

    override config: ModuleConfig<GradientConfig> = new ModuleConfig(
        {
            gridRange: INITIAL_GRID_RANGE,
            type: GradientType.BW,
            easing: true,
            easingFactor: 0,
            scaling: 1,
            offset: 0,
            custom: '0:#FF0000, 0.333:#00FF00, 0.667:#0000FF, 1:#FF0000',
        },
        'gradientConfig',
        [
            new UiFieldStringEnum('type', GradientType, 'Gradient Type', 'Type of Gradient (selection of predefined or a custom one)'),
            new UiFieldString('custom', 'Custum String', 'Custom input for Gradient. Syntax comma separated x:color, e.g. \'0:#FF0000, 1:#0000FF\''),
            new UiFieldBool('easing', 'Easing', 'Whether colors should be interpolated (bahave like Gradient) or just show solid colors'),
            new UiFieldFloat('easingFactor', 'Easing Factor', 'How Gradient behaves around the support points (0: linear, 1: quadratic)', 0, 1),
            new UiFieldFloat('scaling', 'Scaling', 'Gradient is scaled by this factor', 0.01, 10000),
            new UiFieldFloat('offset', 'Offset', 'Gradient Offset (applied after scaling)', -10000, 10000),
        ],
    );

    override init(): void {
        this.grid.updateRange(this.config.data.gridRange);
        this.refresh();
    }

    override refresh() {
        this.calculate();
    }

    private calculate() {
        this.updateImage(this.createImage());
    }

    private createImage(): ImageDataArray {
        const imageData = new Uint8ClampedArray(this.grid.size * 4);
        const colorMapper = this.getColorMapper();

        for (let row = 0; row < this.grid.height; row++) {
            for (let col = 0; col < this.grid.width; col++) {
                const [x, y] = this.grid.pixelToMath(col, row);
                const index = this.grid.getIndex(col, row);
                const color = colorMapper.map(x, 10 / this.mapYToScale(y) * this.config.data.scaling, this.config.data.offset);
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
        const easingFactor: number | null = (this.config.data.easing) ? this.config.data.easingFactor : null;
        switch (this.config.data.type) {
            case GradientType.BW: return ColorMapper.fromColors(COLORS.BW, easingFactor);
            case GradientType.HOT_METAL: return ColorMapper.fromColors(COLORS.HOT_METAL, easingFactor);
            case GradientType.RAINBOW: return ColorMapper.fromColors(COLORS.RAINBOW, easingFactor);
            case GradientType.OCEAN: return ColorMapper.fromColors(COLORS.OCEAN, easingFactor);
            case GradientType.FIRE: return ColorMapper.fromColors(COLORS.FIRE, easingFactor);
            case GradientType.PURPLE_HAZE: return ColorMapper.fromColors(COLORS.PURPLE_HAZE, easingFactor);
            case GradientType.GREYSCALE: return ColorMapper.fromColors(COLORS.GREYSCALE, easingFactor);
            case GradientType.SUNSET: return ColorMapper.fromColors(COLORS.SUNSET, easingFactor);
            case GradientType.ELECTRIC: return ColorMapper.fromColors(COLORS.ELECTRIC, easingFactor);
            case GradientType.PASTEL: return ColorMapper.fromColors(COLORS.PASTEL, easingFactor);
            case GradientType.C64_RAINBOW: return ColorMapper.fromColors(COLORS.C64_RAINBOW, easingFactor);
            case GradientType.C64_MANDELBROT: return ColorMapper.fromColors(COLORS.C64_MANDELBROT, easingFactor);
            case GradientType.C64_ALL_COLORS: return ColorMapper.fromColors(COLORS.C64_ALL_COLORS, easingFactor);
            default: return ColorMapper.fromString(this.config.data.custom, easingFactor);
        }
    }

    private mapYToScale(y: number): number {
        return y > 0
            ? Math.floor(y + 0.5) + 1
            : 1 / (Math.floor(-y + 0.5) + 1);
    }
}