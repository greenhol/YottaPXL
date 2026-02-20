import { GridRange, rangeXdiff } from './grid-range';
import { Resolution } from './resolutions';

export interface GridBlueprint {
    resolution: Resolution,
    range: GridRange,
}

export function gridCopy(blueprint: GridBlueprint): Grid {
    return new Grid(blueprint.resolution, blueprint.range);
}

export class Grid {
    private _resolution: Resolution;
    private _width: number;
    private _height: number;
    private _xMin: number;
    private _xMax: number;
    private _xDiff: number;
    private _yMin: number;
    private _yMax: number;
    private _yDiff: number;

    private _range: GridRange;

    constructor(resolution: Resolution, range: GridRange) {
        this._resolution = resolution;
        this._width = resolution.width;
        this._height = resolution.height;
        this.setRange(range);
        console.log(`Grid (${this._width} x ${this._height}) created for resolution: ${resolution.description}`);
    }

    public updateRange(range: GridRange) {
        this.setRange(range);
        console.log(`Grid (${this._width} x ${this._height}) range set to: ${range.xMin} -> ${range.xMax} and yCenter: ${range.yCenter}`);
    }

    public getIndex(col: number, row: number): number {
        return row * this._width + col;
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

    public get resolution(): Resolution { return this._resolution }

    public get width(): number { return this._width }

    public get height(): number { return this._height }

    public get size(): number { return this._width * this._height }

    public get ratio(): number { return this._width / this._height }

    public get range(): GridRange { return this._range }

    public get xDiff(): number { return this._xDiff }

    public get blueprint(): GridBlueprint {
        return {
            resolution: { width: this._width, height: this.height, description: `${this._resolution.description} (Copy)` },
            range: this._range,
        }
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