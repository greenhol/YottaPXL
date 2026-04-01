import { InitializeAfterConstruct } from '../../../shared';
import { ModuleConfig, UiFieldFloat, UiFieldString } from '../../../shared/config';
import { GridRange } from '../../grid/grid-range';
import { ColorMapper } from '../../math/color-mapper/color-mapper';
import { COLORS } from '../../types/colors';
import { Plane, PlaneConfig } from '../plane';

interface GradientConfig extends PlaneConfig {
    easingFactor: number,
    custom: string,
};

const INITIAL_GRID_RANGE: GridRange = { xMin: 0, xMax: 10, yCenter: 0 };

@InitializeAfterConstruct()
export class Gradient extends Plane {

    override config: ModuleConfig<GradientConfig> = new ModuleConfig(
        {
            gridRange: INITIAL_GRID_RANGE,
            easingFactor: 0,
            custom: '',
        },
        'gradientConfig',
        [
            new UiFieldFloat('easingFactor', 'Easing', 'How Gradient behaves around the support points (0: linear, 1: quadratic)', 0, 1),
            new UiFieldString('custom', 'Custum', 'Custom input for Gradient. Syntax comma separated x:color, e.g. \'0:#FF0000, 1:#0000FF\''),
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
        const colorMapper = (this.config.data.custom.length > 0) ?
            ColorMapper.fromString(this.config.data.custom, this.config.data.easingFactor) :
            ColorMapper.fromColors(COLORS.BW, this.config.data.easingFactor);

        for (let row = 0; row < this.grid.height; row++) {
            for (let col = 0; col < this.grid.width; col++) {
                const [x, y] = this.grid.pixelToMath(col, row);
                const index = this.grid.getIndex(col, row);
                const color = colorMapper.map(x, 10 / this.mapYToScale(y));
                const pixelIndex = index * 4;
                imageData[pixelIndex] = color.r;
                imageData[pixelIndex + 1] = color.g;
                imageData[pixelIndex + 2] = color.b;
                imageData[pixelIndex + 3] = 255; // A (opaque)
            }
        }
        return imageData;
    }

    private mapYToScale(y: number): number {
        return y > 0
            ? Math.floor(y + 0.5) + 1
            : 1 / (Math.floor(-y + 0.5) + 1);
    }
}