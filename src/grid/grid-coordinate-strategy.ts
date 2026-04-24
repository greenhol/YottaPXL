import { BigDecimal } from '../types';
import { GridRange } from './grid-range';

/**
 * Coordinate strategy backed by plain JS numbers.
 *
 * Receives a GridRange (BigDecimal) on construction and on every updateRange
 * call, converts the fields to number once at that point, then stores plain
 * number fields for use in the render loop. The conversion happens once per
 * range update — never once per pixel — so performance in the hot path is
 * identical to the original Grid implementation.
 *
 * Use this strategy until Grid.viewportPrecisionSufficient returns false.
 */
export class NumberCoordinateStrategy {
    private readonly _width: number;
    private readonly _height: number;
    private readonly _ratio: number;
    private _range: GridRange;
    private _xMin: number = 0;
    private _xMax: number = 0;
    private _xDiff: number = 0;
    private _yMin: number = 0;
    private _yMax: number = 0;
    private _yDiff: number = 0;

    constructor(range: GridRange, width: number, height: number) {
        this._width = width;
        this._height = height;
        this._ratio = width / height;
        this._range = range;
        this.updateRange(range);
    }

    public updateRange(range: GridRange): void {
        this._range = range;
        this._xMin = range.xMin.toNumber();
        this._xMax = range.xMax.toNumber();
        this._xDiff = range.xMax.sub(range.xMin).toNumber();
        this._yDiff = this._xDiff / this._ratio;
        this._yMin = range.yCenter.toNumber() - this._yDiff / 2;
        this._yMax = range.yCenter.toNumber() + this._yDiff / 2;
    }

    public pixelToMath(col: number, row: number): [number, number] {
        return [
            this._xMin + (col / this._width) * this._xDiff,
            this._yMax - (row / this._height) * this._yDiff,
        ];
    }

    public mathToPixel(x: number, y: number): [number, number] {
        return [
            Math.round((x - this._xMin) * this._width / this._xDiff),
            Math.round((this._yMax - y) * this._height / this._yDiff),
        ];
    }

    public get xDiff(): number { return this._xDiff; }
    public get range(): GridRange { return this._range; }
}

// =============================================================================
// BigDecimal strategy
// =============================================================================

/**
 * Coordinate strategy backed by BigDecimal.
 *
 * All derived values (_xDiff, _yDiff, _yMin, _yMax) are kept as BigDecimal
 * throughout. pixelToMath returns [BigDecimal, BigDecimal] so the Mandelbrot
 * iteration layer can consume full-precision coordinates directly.
 * mathToPixel accepts [BigDecimal, BigDecimal] for the same reason and only
 * converts to number at the very last step for the pixel return value.
 *
 * Use this strategy when the user has zoomed deep enough that double precision
 * is insufficient — i.e. when Grid.viewportPrecisionSufficient returns false.
 */
export class BigDecimalCoordinateStrategy {
    private readonly _width: number;
    private readonly _height: number;
    private readonly _ratio: number;
    private _range: GridRange;
    private _xMin: BigDecimal = BigDecimal.ZERO;
    private _xMax: BigDecimal = BigDecimal.ZERO;
    private _xDiff: BigDecimal = BigDecimal.ZERO;
    private _yMin: BigDecimal = BigDecimal.ZERO;
    private _yMax: BigDecimal = BigDecimal.ZERO;
    private _yDiff: BigDecimal = BigDecimal.ZERO;

    constructor(range: GridRange, width: number, height: number) {
        this._width = width;
        this._height = height;
        this._ratio = width / height;
        this._range = range;
        this.updateRange(range);
    }

    public updateRange(range: GridRange): void {
        const ratio = BigDecimal.fromNumber(this._ratio);
        this._range = range;
        this._xMin = range.xMin;
        this._xMax = range.xMax;
        this._xDiff = range.xMax.sub(range.xMin);
        this._yDiff = this._xDiff.div(ratio);
        this._yMin = range.yCenter.sub(this._yDiff.div(BigDecimal.TWO));
        this._yMax = range.yCenter.add(this._yDiff.div(BigDecimal.TWO));
    }

    public pixelToMath(col: number, row: number): [BigDecimal, BigDecimal] {
        // col / width and row / height are pixel fractions — always in [0, 1]
        // with at most screen-resolution precision, so forming them as plain
        // numbers before converting to BigDecimal is correct and sufficient.
        const xFraction = BigDecimal.fromNumber(col / this._width);
        const yFraction = BigDecimal.fromNumber(row / this._height);

        return [
            this._xMin.add(xFraction.mul(this._xDiff)),
            this._yMax.sub(yFraction.mul(this._yDiff)),
        ];
    }

    public mathToPixel(x: BigDecimal, y: BigDecimal): [number, number] {
        const bigWidth = BigDecimal.fromNumber(this._width);
        const bigHeight = BigDecimal.fromNumber(this._height);

        const pixelX = x.sub(this._xMin).mul(bigWidth).div(this._xDiff);
        const pixelY = this._yMax.sub(y).mul(bigHeight).div(this._yDiff);

        return [Math.round(pixelX.toNumber()), Math.round(pixelY.toNumber())];
    }

    public get xDiff(): BigDecimal { return this._xDiff; }
    public get range(): GridRange { return this._range; }
}
