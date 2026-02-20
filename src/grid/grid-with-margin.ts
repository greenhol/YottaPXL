import { Grid } from './grid';
import { GridRange, rangeXdiff } from './grid-range';
import { Resolution } from './resolutions';

export interface GridWithMarginBlueprint {
    baseResolution: Resolution,
    baseRange: GridRange,
    margin: number,
}

export function gridWithMarginCopy(blueprint: GridWithMarginBlueprint): GridWithMargin {
    return new GridWithMargin(blueprint.baseResolution, blueprint.baseRange, blueprint.margin);
}

export class GridWithMargin extends Grid {

    private _baseResolution: Resolution;
    private _baseRange: GridRange;
    private _margin: number;

    private static resolutionWithMargin(resolution: Resolution, margin: number): Resolution {
        return {
            width: resolution.width + 2 * margin,
            height: resolution.height + 2 * margin,
            description: `${resolution.description} + buffer:${margin}`,
        }
    }

    constructor(baseResolution: Resolution, baseRange: GridRange, margin: number) {
        const resolution = GridWithMargin.resolutionWithMargin(baseResolution, margin)
        const newGridRangeFactor = resolution.width / baseResolution.width;
        const mathBaseWidth = rangeXdiff(baseRange);
        const cx = baseRange.xMin + rangeXdiff(baseRange) / 2;

        super(GridWithMargin.resolutionWithMargin(baseResolution, margin), {
            xMin: cx - mathBaseWidth / 2 * newGridRangeFactor,
            xMax: cx + mathBaseWidth / 2 * newGridRangeFactor,
            yCenter: baseRange.yCenter,
        });
        this._margin = margin;
    }

    public getIndexForCenterArea(col: number, row: number): number {
        return super.getIndex(col + this._margin, row + this._margin);
    }

    public get margin(): number {
        return this._margin;
    }

    public get withMarginBlueprint(): GridWithMarginBlueprint {
        return {
            baseResolution: { width: this._baseResolution.width, height: this._baseResolution.height, description: `${this._baseResolution.description} (Copy)` },
            baseRange: this._baseRange,
            margin: this._margin,
        }
    }
}
