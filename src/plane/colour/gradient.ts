import { ColourMapper, ColourMapperConfig, Easing } from '../../../shared/colour/colour-mapper';
import { ModuleConfig } from '../../../shared/config';
import { InitializeAfterConstruct } from '../../../shared/initializable';
import { GridRange } from '../../grid/grid-range';
import { BigDecimal } from '../../types/big-decimal';
import { Colours } from '../../types/colours';
import { Plane, PlaneConfig } from '../plane';
import { CREATE } from '../ui/plane-config-field-creator';

enum GradientDemos {
    BW = 'Black White',
    RGB = 'Red Green Blue',
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
    C64_ALL_COLOURS = 'C64 All Colours',
}

interface GradientPlaneConfig extends PlaneConfig {
    demo: GradientDemos,
    config: ColourMapperConfig,
};

const INITIAL_GRID_RANGE: GridRange = { xMin: BigDecimal.ZERO, xMax: BigDecimal.fromNumber(10), yCenter: BigDecimal.ZERO };

@InitializeAfterConstruct()
export class Gradient extends Plane {

    override config: ModuleConfig<GradientPlaneConfig> = new ModuleConfig(
        {
            gridRange: GridRange.serialize(INITIAL_GRID_RANGE),
            demo: GradientDemos.BW,
            config: {
                supportPoints: '',
                easing: Easing.RGB_LINEAR,
                scaling: 1,
                offset: 0,
            },
        },
        'gradientConfig',
        [
            CREATE.UI_FIELD_HEADER_GRADIENT,
            CREATE.createEnumField('demo', GradientDemos, 'Gradient Demos', 'Gradient Demos (selection of predefined definitions)'),
            CREATE.uiFieldGradientSupportPoints('config.supportPoints'),
            CREATE.uiFieldGradientEasing('config.easing'),
            CREATE.uiFieldGradientScaling('config.scaling'),
            CREATE.uiFieldGradientOffset('config.offset'),
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
        const colourMapper = this.getColourMapper();
        this.config.setInfo('Effective Gradient', colourMapper.supportPointsString);

        for (let row = 0; row < this.grid.height; row++) {
            for (let col = 0; col < this.grid.width; col++) {
                const [x, y] = this.grid.pixelToMath(col, row);
                this.setPixel(
                    imageData,
                    this.grid.getIndex(col, row),
                    colourMapper.mapLooped(x, 10 / this.mapYToScale(y) * this.config.data.config.scaling, this.config.data.config.offset),
                );
            }
        }
        return imageData;
    }

    private getColourMapper(): ColourMapper {
        if (this.config.data.config.supportPoints.length > 0) {
            return ColourMapper.fromString(this.config.data.config.supportPoints, this.config.data.config.easing);
        }
        switch (this.config.data.demo) {
            case GradientDemos.BW: return ColourMapper.fromColours(Colours.BW, this.config.data.config.easing);
            case GradientDemos.RGB: return ColourMapper.fromColours(Colours.RGB, this.config.data.config.easing);
            case GradientDemos.HOT_METAL: return ColourMapper.fromColours(Colours.HOT_METAL, this.config.data.config.easing);
            case GradientDemos.RAINBOW: return ColourMapper.fromColours(Colours.RAINBOW, this.config.data.config.easing);
            case GradientDemos.OCEAN: return ColourMapper.fromColours(Colours.OCEAN, this.config.data.config.easing);
            case GradientDemos.FIRE: return ColourMapper.fromColours(Colours.FIRE, this.config.data.config.easing);
            case GradientDemos.PURPLE_HAZE: return ColourMapper.fromColours(Colours.PURPLE_HAZE, this.config.data.config.easing);
            case GradientDemos.GREYSCALE: return ColourMapper.fromColours(Colours.GREYSCALE, this.config.data.config.easing);
            case GradientDemos.SUNSET: return ColourMapper.fromColours(Colours.SUNSET, this.config.data.config.easing);
            case GradientDemos.ELECTRIC: return ColourMapper.fromColours(Colours.ELECTRIC, this.config.data.config.easing);
            case GradientDemos.PASTEL: return ColourMapper.fromColours(Colours.PASTEL, this.config.data.config.easing);
            case GradientDemos.CAPPUCCINO: return ColourMapper.fromColours(Colours.CAPPUCCINO, this.config.data.config.easing);
            case GradientDemos.C64_RAINBOW: return ColourMapper.fromColours(Colours.C64_RAINBOW, this.config.data.config.easing);
            case GradientDemos.C64_MANDELBROT: return ColourMapper.fromColours(Colours.C64_MANDELBROT, this.config.data.config.easing);
            case GradientDemos.C64_ALL_COLOURS: return ColourMapper.fromColours(Colours.C64_ALL_COLOURS, this.config.data.config.easing);
        }
    }

    private mapYToScale(y: number): number {
        return y > 0
            ? Math.floor(y + 0.5) + 1
            : 1 / (Math.floor(-y + 0.5) + 1);
    }
}