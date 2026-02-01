import { BehaviorSubject, Observable } from 'rxjs';
import { Resolution } from './resolutions';
import { GridRange } from './grid-range';

const DEFAULT_GRID_RANGE = { xMin: 0, xMax: 1, yCenter: 0 };

export class Grid {
    private _resolution: Resolution;
    private _width: number;
    private _height: number;
    private _xMin: number;
    private _xMax: number;
    private _xRange: number;
    private _yMin: number;
    private _yMax: number;
    private _yRange: number;

    private _range$ = new BehaviorSubject<GridRange>(DEFAULT_GRID_RANGE);
    public range$: Observable<GridRange> = this._range$;

    constructor(resolution: Resolution) {
        this._resolution = resolution;
        this._width = resolution.width;
        this._height = resolution.height;
        this.setRange(DEFAULT_GRID_RANGE);
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
            this._xMin + col / this.width * this._xRange,
            this._yMax - row / this.height * this._yRange,
        ];
    }

    public mathToPixel(x: number, y: number): [number, number] {
        return [
            Math.round((x - this._xMin) * this.width / this._xRange),
            Math.round((this._yMax - y) * this.height / this._yRange),
        ];
    }

    public get resolution(): Resolution { return this._resolution }

    public get width(): number { return this._width }

    public get height(): number { return this._height }

    public get size(): number { return this._width * this._height }

    public get ratio(): number { return this._width / this._height }

    public get range(): GridRange { return this._range$.value }

    public toString(): string {
        return `width: ${this.width}, height:${this.height} -> size ${this.size}`;
    }

    private setRange(range: GridRange) {
        this._range$.next(range);
        this._yRange = (range.xMax - range.xMin) / this.ratio;
        this._xMin = range.xMin;
        this._xMax = range.xMax;
        this._xRange = range.xMax - range.xMin;
        this._yMin = range.yCenter - this._yRange / 2;
        this._yMax = range.yCenter + this._yRange / 2;
    }
}