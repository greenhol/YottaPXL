import { Resolution } from './resolutions';

export interface GridRange {
    xMin: number;
    xMax: number;
    yCenter: number;
}

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

    constructor(resolution: Resolution) {
        this._resolution = resolution;
        this._width = resolution.width;
        this._height = resolution.height;
        this.setRange({ xMin: 0, xMax: 1, yCenter: 0 });
        console.log(`Grid (${this._width} x ${this._height}) created for resolution: ${resolution.description}`);
    }

    public updateRange(range: GridRange) {
        this.setRange(range);
        console.log(`Grid (${this._width} x ${this._height}) range set to: ${range.xMin} -> ${range.xMax} and yCenter: ${range.yCenter}`);
    }

    public getIndex(pixelX: number, pixelY: number): number {
        return pixelY * this._width + pixelX;
    }

    public pixelToMath(pixelX: number, pixelY: number): [number, number] {
        return [
            this._xMin + (pixelX / this.width) * (this._xRange),
            this._yMax - (pixelY / this.height) * (this._yRange),
        ];
    }

    public get resolution(): Resolution { return this._resolution }

    public get width(): number { return this._width }

    public get height(): number { return this._height }

    public get size(): number { return this._width * this._height }

    public get ratio(): number { return this._width / this._height }

    public toString(): string {
        return `width: ${this.width}, height:${this.height} -> size ${this.size}`;
    }

    private setRange(range: GridRange) {
        this._yRange = (range.xMax - range.xMin) / this.ratio;
        this._xMin = range.xMin;
        this._xMax = range.xMax;
        this._xRange = range.xMax - range.xMin;
        this._yMin = range.yCenter - this._yRange / 2;
        this._yMax = range.yCenter + this._yRange / 2;
    }
}