export class Grid {
    private _width: number;
    private _height: number;
    private _xMin: number;
    private _xMax: number;
    private _xRange: number;
    private _yMin: number;
    private _yMax: number;
    private _yRange: number;

    constructor(width: number, height: number) {
        this._width = width;
        this._height = height;
        this.setRange(0, 1);
    }

    public setRange(xMin: number, xMax: number, yCenter: number = 0) {
        this._yRange = (xMax - xMin) / this.ratio;
        this._xMin = xMin;
        this._xMax = xMax;
        this._xRange = xMax - xMin;
        this._yMin = yCenter - this._yRange / 2;
        this._yMax = yCenter + this._yRange / 2;
    }

    public get(pixelX: number, pixelY: number): number {
        return pixelY * this.width + pixelX;
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

    public get width(): number { return this._width }

    public get height(): number { return this._height }

    public get size(): number { return this._width * this._height }

    public get ratio(): number { return this._width / this._height }

    public toString(): string {
        return `width: ${this.width}, height:${this.height} -> size ${this.size}`;
    }
}