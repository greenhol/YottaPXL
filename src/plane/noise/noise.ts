import { ModuleConfig } from '../../config/module-config';
import { Grid } from '../../grid/grid';
import { GridRange } from '../../grid/grid-range';
import { GridWithBuffer } from '../../grid/grid-with-buffer';
import { NoiseGenerator } from '../../shared/NoiseGenerator';
import { Plane, PlaneConfig } from '../plane';

const INITIAL_GRID_RANGE: GridRange = { xMin: 0, xMax: 1, yCenter: 0 };

export class Noise extends Plane {

    private _sourceGrid: GridWithBuffer;
    private _data: Float64Array;
    private _buffer = 0;

    constructor(grid: Grid) {
        super(grid);
        this.create();
    }

    override config: ModuleConfig<PlaneConfig> = new ModuleConfig(
        { gridRange: INITIAL_GRID_RANGE },
        'noise',
    );

    override name: string = 'Noise';

    override updateGridRange(selectedRange: GridRange) {
        // ToDo
    }

    override setMaxIterations(value: number) {
        // Does not apply
    }

    private create() {
        this.setBusy();
        const range = this.config.data.gridRange;
        this.grid.updateRange(range);
        this._sourceGrid = new GridWithBuffer(this.grid.resolution, range, this._buffer);

        // ToDo: remove setTimeouts when web workers are 
        setTimeout(() => {
            const generator = new NoiseGenerator(this._sourceGrid);
            this._data = generator.createGaussianNoise();
            
            this.updateImage(this.createImage());

            setTimeout(() => {
                this.setIdle();
            }, 50);
        }, 50);
    }

    private createImage(): ImageDataArray {
        const imageData = new Uint8ClampedArray(this.grid.size * 4);
        for (let y = 0; y < this.grid.height; y++) {
            for (let x = 0; x < this.grid.width; x++) {
                const destinationIndex = this._sourceGrid.getIndexForCenterArea(x, y);
                let value = Math.round(this._data[destinationIndex] * 255);
                const index = this.grid.getIndex(x, y);
                const pixelIndex = index * 4;
                imageData[pixelIndex] = value;     // R
                imageData[pixelIndex + 1] = value; // G
                imageData[pixelIndex + 2] = value; // B
                imageData[pixelIndex + 3] = 255; // A (opaque)
            }
        }
        return imageData;
    }
}