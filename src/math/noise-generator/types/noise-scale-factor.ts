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
        console.error(`#getNoiseScaleFactor - noiseScaleFactor ${factor} invalid, using ${NoiseScaleFactor.NONE}`);
        return NoiseScaleFactor.NONE;
    }
}
