export enum NoiseScaleFactor {
    NONE = 1,
    TWO = 2,
    THREE = 3,
    FOUR = 4,
    FIVE = 5,
    SIX = 6,
    SEVEN = 7,
    EIGHT = 8,
    NINE = 9,
    TEN = 10,
}

export function getNoiseScaleFactor(factor: number): NoiseScaleFactor {
    if (NoiseScaleFactor[factor] !== undefined) {
        return factor as NoiseScaleFactor;
    } else {
        console.error(`#getBernoulliScaleFactor - noiseScaleFactor ${factor} invalid, using ${NoiseScaleFactor.NONE}`);
        return NoiseScaleFactor.NONE;
    }
}

export enum BernoulliNoiseType {
    DEFAULT,
    ISOLATED,
    ISOLATED_BIG,
}

export enum BiasType {
    LOWER,
    UPPER,
    CENTER,
    BOUNDS,
    BOUNDS_BY_CUBIC,
    BOUNDS_BY_QUINTIC,
    BOUNDS_BY_SEPTIC,
    BOUNDS_BY_TRIG,
}
