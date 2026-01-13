import { Grid, GridRange } from './grid';
import { Resolution } from './resolutions';

export class GridWithBuffer extends Grid {

    private _buffer: number;

    private static resolutionWithBuffer(resolution: Resolution, buffer: number): Resolution {
        return {
            width: resolution.width + 2 * buffer,
            height: resolution.height + 2 * buffer,
            description: `${resolution.description} + buffer:${buffer}`,
        }
    }

    constructor(baseResolution: Resolution, baseRange: GridRange, buffer: number) {
        super(GridWithBuffer.resolutionWithBuffer(baseResolution, buffer));

        this._buffer = buffer;

        const newGridRangeFactor = this.resolution.width / baseResolution.width;
        const mathBaseWidth = baseRange.xMax - baseRange.xMin;
        const [cx, cy] = this.getMathCenter(baseRange);
        this.updateRange({
            xMin: cx - mathBaseWidth / 2 * newGridRangeFactor,
            xMax: cx + mathBaseWidth / 2 * newGridRangeFactor,
            yCenter: cy,
        });
    }

    public getIndexForCenterArea(pixelX: number, pixelY: number): number {
        return super.getIndex(pixelX + this._buffer, pixelY + this._buffer);
    }

    private getMathCenter(range: GridRange): [number, number] {
        return [
            range.xMin + (range.xMax - range.xMin) / 2,
            range.yCenter,
        ];
    }
}
