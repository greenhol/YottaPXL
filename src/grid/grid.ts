import { BigDecimal } from '../types';
import { BigDecimalCoordinateStrategy, NumberCoordinateStrategy } from './grid-coordinate-strategy';
import { GridRange, gridRangeFromJson, GridRangeSerialized, gridRangeToJson } from './grid-range';
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
        return new Grid(blueprint.resolution, gridRangeFromJson(blueprint.rangeSerialized));
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

    /**
     * Switch to BigDecimal precision.
     * The current GridRange is passed directly — no conversion needed since
     * GridRange already carries BigDecimal values.
     */
    public switchToBigDecimalStrategy(): boolean {
        const needToSwitchStrategy = !this.isUsingBigDecimalStrategy;
        if (needToSwitchStrategy) {
            this._strategy = new BigDecimalCoordinateStrategy(this._strategy.range, this.width, this.height);
        }
        return needToSwitchStrategy;
    }

    /**
     * Switch back to number precision.
     * The NumberCoordinateStrategy will convert the BigDecimal fields to
     * number once on construction. This conversion is lossy if the range
     * has more than ~15 significant digits.
     */
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

    // ---------------------------------------------------------------------------
    // Coordinate mapping — type-narrowed per strategy
    // ---------------------------------------------------------------------------

    /**
     * Map a pixel position to math-space coordinates using plain numbers.
     * Only valid when the number strategy is active.
     */
    public pixelToMath(col: number, row: number): [number, number] {
        if (!(this._strategy instanceof NumberCoordinateStrategy)) {
            throw new Error("pixelToMath returning number is only valid for NumberCoordinateStrategy. Use pixelToMathBigDecimal instead.");
        }
        return this._strategy.pixelToMath(col, row);
    }

    /**
     * Map a pixel position to math-space coordinates using BigDecimal.
     * Only valid when the BigDecimal strategy is active.
     */
    public pixelToMathBigDecimal(col: number, row: number): [BigDecimal, BigDecimal] {
        if (!(this._strategy instanceof BigDecimalCoordinateStrategy)) {
            throw new Error("pixelToMathBigDecimal is only valid for BigDecimalCoordinateStrategy. Use pixelToMath instead.");
        }
        return this._strategy.pixelToMath(col, row);
    }

    /**
     * Map math-space coordinates to a pixel position using plain numbers.
     * Only valid when the number strategy is active.
     */
    public mathToPixel(x: number, y: number): [number, number] {
        if (!(this._strategy instanceof NumberCoordinateStrategy)) {
            throw new Error("mathToPixel with number arguments is only valid for NumberCoordinateStrategy. Use mathToPixelBigDecimal instead.");
        }
        return this._strategy.mathToPixel(x, y);
    }

    /**
     * Map math-space coordinates to a pixel position using BigDecimal.
     * Only valid when the BigDecimal strategy is active.
     */
    public mathToPixelBigDecimal(x: BigDecimal, y: BigDecimal): [number, number] {
        if (!(this._strategy instanceof BigDecimalCoordinateStrategy)) {
            throw new Error("mathToPixelBigDecimal is only valid for BigDecimalCoordinateStrategy. Use mathToPixel instead.");
        }
        return this._strategy.mathToPixel(x, y);
    }

    /**
     * Returns true if the current viewport width can be represented as a JS
     * number without precision loss. When this returns false the render will
     * start producing artefacts and the user should be prompted to switch
     * to the BigDecimal strategy.
     */
    public get viewportPrecisionSufficient(): boolean {
        return this._strategy.range.xMax
            .sub(this._strategy.range.xMin)
            .noPrecisionLost();
    }

    public get resolution(): Resolution { return this._resolution; }

    public get range(): GridRange { return this._strategy.range; }

    /**
     * The viewport width in math-space.
     * Returned as BigDecimal to preserve full precision — call toNumber()
     * at the point of consumption if a plain number is acceptable.
     */
    public get xDiff(): BigDecimal {
        if (this._strategy instanceof BigDecimalCoordinateStrategy) {
            return this._strategy.xDiff;
        }
        return BigDecimal.fromNumber(this._strategy.xDiff);
    }

    public get blueprint(): GridBlueprint {
        return {
            resolution: { width: this.width, height: this.height, description: `${this._resolution.description} (Copy)` },
            rangeSerialized: gridRangeToJson(this._strategy.range),
        };
    }
}