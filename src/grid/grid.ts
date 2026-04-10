import { GridRange, rangeXdiff } from './grid-range';
import { GridWithoutRange } from './grid-without-range';
import { Resolution } from './resolutions';

export interface GridBlueprint {
    resolution: Resolution,
    range: GridRange,
}

export class Grid extends GridWithoutRange {
    private _resolution: Resolution;
    private _xMin: number;
    private _xMax: number;
    private _xDiff: number;
    private _yMin: number;
    private _yMax: number;
    private _yDiff: number;

    private _range: GridRange;

    public static copy(blueprint: GridBlueprint): Grid {
        return new Grid(blueprint.resolution, blueprint.range);
    }

    constructor(resolution: Resolution, range: GridRange) {
        super(resolution.width, resolution.height);
        this._resolution = resolution;
        this.setRange(range);
        // console.info(`Grid (${this._width} x ${this._height}) created for resolution: ${resolution.description}`);
    }

    public updateRange(range: GridRange) {
        this.setRange(range);
        console.log(`Grid (${this.width} x ${this.height}) range set to: ${range.xMin} -> ${range.xMax} and yCenter: ${range.yCenter}`);
    }

    public pixelToMath(col: number, row: number): [number, number] {
        return [
            this._xMin + col / this.width * this._xDiff,
            this._yMax - row / this.height * this._yDiff,
        ];
    }

    public mathToPixel(x: number, y: number): [number, number] {
        return [
            Math.round((x - this._xMin) * this.width / this._xDiff),
            Math.round((this._yMax - y) * this.height / this._yDiff),
        ];
    }

    public get resolution(): Resolution { return this._resolution; }

    public get range(): GridRange { return this._range; }

    public get xDiff(): number { return this._xDiff; }

    public get blueprint(): GridBlueprint {
        return {
            resolution: { width: this.width, height: this.height, description: `${this._resolution.description} (Copy)` },
            range: this._range,
        };
    }

    public toString(): string {
        return `width: ${this.width}, height:${this.height} -> size ${this.size}`;
    }

    private setRange(range: GridRange) {
        this._range = range;
        this._yDiff = rangeXdiff(range) / this.ratio;
        this._xMin = range.xMin;
        this._xMax = range.xMax;
        this._xDiff = rangeXdiff(range);
        this._yMin = range.yCenter - this._yDiff / 2;
        this._yMax = range.yCenter + this._yDiff / 2;
    }
}