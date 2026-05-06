import { BigDecimal } from '../types';
import { BigDecimalCoordinateStrategy, NumberCoordinateStrategy } from './grid-coordinate-strategy';
import { GridRange, GridRangeSerialized } from './grid-range';
import { GridWithoutRange } from './grid-without-range';
import { Resolution } from './resolutions';

export interface GridBlueprint {
    resolution: Resolution,
    rangeSerialized: GridRangeSerialized,
}

export class Grid extends GridWithoutRange {
    private _resolution: Resolution;
    private _strategy: NumberCoordinateStrategy | BigDecimalCoordinateStrategy;

    public static copy(blueprint: GridBlueprint): Grid {
        return new Grid(blueprint.resolution, GridRangeSerialized.deserialize(blueprint.rangeSerialized));
    }

    constructor(resolution: Resolution, range: GridRange) {
        super(resolution.width, resolution.height);
        this._resolution = resolution;
        this._strategy = new NumberCoordinateStrategy(range, resolution.width, resolution.height);
        // console.info(`Grid (${this._width} x ${this._height}) created for resolution: ${resolution.description}`);
    }

    public updateRange(range: GridRange): void {
        this._strategy.updateRange(range);
        console.log(`Grid (${this.width} x ${this.height}) range set to: ${range.xMin} -> ${range.xMax} and yCenter: ${range.yCenter}`);
    }

    public switchToBigDecimalStrategy(): boolean {
        const needToSwitchStrategy = !this.isUsingBigDecimalStrategy;
        if (needToSwitchStrategy) {
            this._strategy = new BigDecimalCoordinateStrategy(this._strategy.range, this.width, this.height);
        }
        return needToSwitchStrategy;
    }

    public switchToNumberStrategy(): boolean {
        const needToSwitchStrategy = this.isUsingBigDecimalStrategy;
        if (needToSwitchStrategy) {
            this._strategy = new NumberCoordinateStrategy(this._strategy.range, this.width, this.height);
        }
        return needToSwitchStrategy;
    }

    public get isUsingBigDecimalStrategy(): boolean {
        return this._strategy instanceof BigDecimalCoordinateStrategy;
    }

    public pixelToMath(col: number, row: number): [number, number] {
        if (!(this._strategy instanceof NumberCoordinateStrategy)) {
            throw new Error("pixelToMath returning number is only valid for NumberCoordinateStrategy. Use pixelToMathBigDecimal instead.");
        }
        return this._strategy.pixelToMath(col, row);
    }

    public pixelToMathBigDecimal(col: number, row: number): [BigDecimal, BigDecimal] {
        if (!(this._strategy instanceof BigDecimalCoordinateStrategy)) {
            throw new Error("pixelToMathBigDecimal is only valid for BigDecimalCoordinateStrategy. Use pixelToMath instead.");
        }
        return this._strategy.pixelToMath(col, row);
    }

    public mathToPixel(x: number, y: number): [number, number] {
        if (!(this._strategy instanceof NumberCoordinateStrategy)) {
            throw new Error("mathToPixel with number arguments is only valid for NumberCoordinateStrategy. Use mathToPixelBigDecimal instead.");
        }
        return this._strategy.mathToPixel(x, y);
    }

    public mathToPixelBigDecimal(x: BigDecimal, y: BigDecimal): [number, number] {
        if (!(this._strategy instanceof BigDecimalCoordinateStrategy)) {
            throw new Error("mathToPixelBigDecimal is only valid for BigDecimalCoordinateStrategy. Use mathToPixel instead.");
        }
        return this._strategy.mathToPixel(x, y);
    }

    /**
     * Returns true if the current viewport width can be represented as a JS
     * number without precision loss.
     */
    public get viewportPrecisionSufficient(): boolean {
        const viewportWidth = this._strategy.range.xMax.sub(this._strategy.range.xMin);
        const pixelStep = viewportWidth.div(BigDecimal.fromNumber(this.width));
        return pixelStep.gt(BigDecimal.fromNumber(Number.EPSILON));
    }

    public get resolution(): Resolution { return this._resolution; }

    public get range(): GridRange { return this._strategy.range; }

    public get yMin(): BigDecimal {
        if (this._strategy instanceof BigDecimalCoordinateStrategy) {
            return this._strategy.yMin;
        }
        return BigDecimal.fromNumber(this._strategy.yMin);
    }

    public get yMax(): BigDecimal {
        if (this._strategy instanceof BigDecimalCoordinateStrategy) {
            return this._strategy.yMax;
        }
        return BigDecimal.fromNumber(this._strategy.yMax);
    }

    public get xDiff(): BigDecimal {
        if (this._strategy instanceof BigDecimalCoordinateStrategy) {
            return this._strategy.xDiff;
        }
        return BigDecimal.fromNumber(this._strategy.xDiff);
    }

    public get pixelsPerMathUnit(): number {
        return this.width / (this.range.xMax.toNumber() - this.range.xMin.toNumber());
    }

    public get blueprint(): GridBlueprint {
        return {
            resolution: { width: this.width, height: this.height, description: `${this._resolution.description} (Copy)` },
            rangeSerialized: GridRange.serialize(this._strategy.range),
        };
    }
}