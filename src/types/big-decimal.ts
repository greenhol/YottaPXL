const SCALE = 60n;
const SCALE_FACTOR = 10n ** SCALE;

/**
 * BigDecimal — arbitrary-precision decimal arithmetic backed by BigInt.
 * Representation:  value = mantissa × 10^(-SCALE)
 */
export class BigDecimal {

    private readonly _mantissa: bigint;

    public static readonly ZERO = new BigDecimal(0n);
    public static readonly ONE = new BigDecimal(SCALE_FACTOR);
    public static readonly TWO = BigDecimal.fromNumber(2);

    /**
     * Parse a decimal string such as "3.14", "-0.000123", or "1.5e-10".
     * Primary constructor and the most precise entry point.
     */
    public static fromString(source: string): BigDecimal {
        source = source.trim();
        if (source === "" || source === ".") throw new RangeError(`Invalid decimal string: "${source}"`);

        // --- Handle sign -------------------------------------------------------
        let negative = false;
        if (source.startsWith("-")) { negative = true; source = source.slice(1); }
        else if (source.startsWith("+")) { source = source.slice(1); }

        // --- Normalise scientific notation -------------------------------------
        // Convert e.g. "1.5e-10" → "0.00000000015" before further parsing.
        const exponentIndex = source.toLowerCase().indexOf("e");
        if (exponentIndex !== -1) {
            const base = source.slice(0, exponentIndex);
            const exponent = parseInt(source.slice(exponentIndex + 1), 10);
            source = BigDecimal.shiftDecimalPoint(base, exponent);
        }

        // --- Split on decimal point --------------------------------------------
        const decimalPointIndex = source.indexOf(".");
        let integerPart: string;
        let fractionalPart: string;

        if (decimalPointIndex === -1) {
            integerPart = source;
            fractionalPart = "";
        } else {
            integerPart = source.slice(0, decimalPointIndex);
            fractionalPart = source.slice(decimalPointIndex + 1);
        }

        // Normalise empty parts
        if (integerPart === "") integerPart = "0";
        if (fractionalPart === "") fractionalPart = "0";

        // --- Build the SCALE-digit fractional string --------------------------
        const scaleAsNumber = Number(SCALE);

        if (fractionalPart.length > scaleAsNumber) {
            // Truncate — we only keep SCALE digits of fraction
            fractionalPart = fractionalPart.slice(0, scaleAsNumber);
        } else {
            // Pad with trailing zeros to exactly SCALE digits
            fractionalPart = fractionalPart.padEnd(scaleAsNumber, "0");
        }

        // --- Combine into mantissa --------------------------------------------
        // e.g. integer "3" + fractional "14000...0" (SCALE digits) → BigInt("314000...0")
        const combinedDigits = integerPart + fractionalPart;
        let mantissa = BigInt(combinedDigits);
        if (negative && mantissa !== 0n) mantissa = -mantissa;

        return new BigDecimal(mantissa);
    }

    public static fromNumber(value: number): BigDecimal {
        if (!isFinite(value)) throw new RangeError(`Cannot convert non-finite number ${value} to BigDecimal`);
        return BigDecimal.fromString(value.toString());
    }

    /**
     * Shift the decimal point of a plain decimal string (no exponent) by
     * `exponent` places. A positive exponent shifts right (×10^exponent),
     * a negative exponent shifts left (÷10^|exponent|).
     *
     * Used to normalise scientific notation inside fromString.
     *
     * Examples:
     *   shiftDecimalPoint("1.5",  -10) → "0.00000000015"
     *   shiftDecimalPoint("3.0",    2) → "300.0"
     */
    private static shiftDecimalPoint(source: string, exponent: number): string {
        // Ensure there is a decimal point to work with
        let decimalPointIndex = source.indexOf(".");
        if (decimalPointIndex === -1) {
            source += ".";
            decimalPointIndex = source.length - 1;
        }

        // Remove the decimal point; remember its position from the left
        const digits = source.replace(".", "");

        // New decimal point position (0-indexed, counts digits to its left)
        const newDecimalPointPosition = decimalPointIndex + exponent;

        if (newDecimalPointPosition <= 0) {
            // Result is 0.000...digits
            return "0." + "0".repeat(-newDecimalPointPosition) + digits;
        } else if (newDecimalPointPosition >= digits.length) {
            // Result is digits followed by zeros, no fractional part
            return digits + "0".repeat(newDecimalPointPosition - digits.length);
        } else {
            return digits.slice(0, newDecimalPointPosition) + "." + digits.slice(newDecimalPointPosition);
        }
    }

    private constructor(mantissa: bigint) {
        this._mantissa = mantissa;
    }

    public add(other: BigDecimal): BigDecimal {
        return new BigDecimal(this._mantissa + other._mantissa);
    }

    public sub(other: BigDecimal): BigDecimal {
        return new BigDecimal(this._mantissa - other._mantissa);
    }

    /**
     * Multiply: (a × 10^-S) × (b × 10^-S) = (a×b) × 10^-2S
     * Division by SCALE_FACTOR to bring the result back to scale S.
     * Division truncates toward zero.
     */
    public mul(other: BigDecimal): BigDecimal {
        return new BigDecimal((this._mantissa * other._mantissa) / SCALE_FACTOR);
    }

    /**
     * Divide: (a × 10^-S) / (b × 10^-S) = a / b   (dimensionless)
     * Pre-multiplication of the numerator by SCALE_FACTOR so the result is at scale S.
     */
    public div(other: BigDecimal): BigDecimal {
        if (other._mantissa === 0n) throw new RangeError("BigDecimal division by zero");
        return new BigDecimal((this._mantissa * SCALE_FACTOR) / other._mantissa);
    }

    public negate(): BigDecimal {
        return new BigDecimal(-this._mantissa);
    }

    public abs(): BigDecimal {
        return new BigDecimal(this._mantissa < 0n ? -this._mantissa : this._mantissa);
    }

    public cmp(other: BigDecimal): -1 | 0 | 1 {
        if (this._mantissa < other._mantissa) return -1;
        if (this._mantissa > other._mantissa) return 1;
        return 0;
    }

    public lt(other: BigDecimal): boolean { return this.cmp(other) === -1; }
    public lte(other: BigDecimal): boolean { return this.cmp(other) !== 1; }
    public gt(other: BigDecimal): boolean { return this.cmp(other) === 1; }
    public gte(other: BigDecimal): boolean { return this.cmp(other) !== -1; }
    public eq(other: BigDecimal): boolean { return this.cmp(other) === 0; }

    /**
     * Convert to JS number — intentionally lossy.
     * Only call this at render time when converting to double is acceptable.
     * 
     * Throws RangeError if the result would be non-finite (value out of double range).
     */
    public toNumber(): number {
        const result = Number(this._mantissa) / Number(SCALE_FACTOR);
        if (!isFinite(result)) {
            throw new RangeError(`BigDecimal value out of number range: ${this.toString()}`);
        }
        return result;
    }

    /**
     * Render as a human-readable decimal string, e.g. "-3.14000..." → "-3.14".
     * Trailing zeros after the decimal point are stripped.
     * If the value is an integer the decimal point is omitted.
     */
    public toString(): string {
        const scaleAsNumber = Number(SCALE);
        const isNegative = this._mantissa < 0n;
        const absoluteValue = isNegative ? -this._mantissa : this._mantissa;

        // Pad to at least scaleAsNumber + 1 characters so we can always split off
        // exactly scaleAsNumber digits as the fractional part.
        const allDigits = absoluteValue.toString().padStart(scaleAsNumber + 1, "0");

        const integerPart = allDigits.slice(0, allDigits.length - scaleAsNumber) || "0";
        const fractionalFull = allDigits.slice(allDigits.length - scaleAsNumber);
        const fractionalTrimmed = fractionalFull.replace(/0+$/, "");

        const body = fractionalTrimmed.length > 0
            ? `${integerPart}.${fractionalTrimmed}`
            : integerPart;

        return isNegative ? `-${body}` : body;
    }
}
