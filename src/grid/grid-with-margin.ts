import { Grid } from './grid';
import { GridRange } from './grid-range';
import { Resolution } from './resolutions';

export class GridWithMargin extends Grid {

    private _margin: number;

    private static resolutionWithBuffer(resolution: Resolution, buffer: number): Resolution {
        return {
            width: resolution.width + 2 * buffer,
            height: resolution.height + 2 * buffer,
            description: `${resolution.description} + buffer:${buffer}`,
        }
    }

    constructor(baseResolution: Resolution, baseRange: GridRange, margin: number) {
        super(GridWithMargin.resolutionWithBuffer(baseResolution, margin));

        this._margin = margin;

        const newGridRangeFactor = this.resolution.width / baseResolution.width;
        const mathBaseWidth = baseRange.xMax - baseRange.xMin;
        const [cx, cy] = this.getMathCenter(baseRange);
        this.updateRange({
            xMin: cx - mathBaseWidth / 2 * newGridRangeFactor,
            xMax: cx + mathBaseWidth / 2 * newGridRangeFactor,
            yCenter: cy,
        });
    }

    public getIndexForCenterArea(col: number, row: number): number {
        return super.getIndex(col + this._margin, row + this._margin);
    }

    private getMathCenter(range: GridRange): [number, number] {
        return [
            range.xMin + (range.xMax - range.xMin) / 2,
            range.yCenter,
        ];
    }
}
