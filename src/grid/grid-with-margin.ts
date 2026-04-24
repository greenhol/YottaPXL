import { BigDecimal } from '../types';
import { Grid } from './grid';
import { GridRange, gridRangeFromJson, GridRangeSerialized, gridRangeToJson, rangeXdiff } from './grid-range';
import { Resolution } from './resolutions';

export interface GridWithMarginBlueprint {
    baseResolution: Resolution,
    baseRangeSerialized: GridRangeSerialized,
    margin: number,
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
        };
    }

    public static copyWithMargin(blueprint: GridWithMarginBlueprint) {
        return new GridWithMargin(blueprint.baseResolution, gridRangeFromJson(blueprint.baseRangeSerialized), blueprint.margin);
    }

    constructor(baseResolution: Resolution, baseRange: GridRange, margin: number) {
        const resolution = GridWithMargin.resolutionWithMargin(baseResolution, margin);
        const newGridRangeFactor = BigDecimal.fromNumber(resolution.width / baseResolution.width);
        const mathBaseWidth = rangeXdiff(baseRange);
        const cx = baseRange.xMin.add(rangeXdiff(baseRange).div(BigDecimal.TWO));

        super(GridWithMargin.resolutionWithMargin(baseResolution, margin), {
            xMin: cx.sub(mathBaseWidth.div(BigDecimal.TWO).mul(newGridRangeFactor)),
            xMax: cx.add(mathBaseWidth.div(BigDecimal.TWO).mul(newGridRangeFactor)),
            yCenter: baseRange.yCenter,
        });
        this._baseResolution = baseResolution;
        this._baseRange = baseRange;
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
            baseRangeSerialized: gridRangeToJson(this._baseRange),
            margin: this._margin,
        };
    }
}
