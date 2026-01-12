import { Resolution } from './resolutions';

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
        this.setRange(0, 1);
        console.log(`Grid (${this._width} x ${this._height}) created for resolution: ${resolution.description}`);
    }

    public setRange(xMin: number, xMax: number, yCenter: number = 0) {
        this._yRange = (xMax - xMin) / this.ratio;
        this._xMin = xMin;
        this._xMax = xMax;
        this._xRange = xMax - xMin;
        this._yMin = yCenter - this._yRange / 2;
        this._yMax = yCenter + this._yRange / 2;
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
}