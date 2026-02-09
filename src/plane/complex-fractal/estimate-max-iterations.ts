export function estimateMaxIterations(userMaxIterations: number, xDiffInitial: number, xDiff: number): number {
    if (userMaxIterations !== 0) {
        return Math.min(Math.max(userMaxIterations, 1), 100000);
    }
    const minIterations = 255;
    const maxIterations = 10000;
    const scalingFactor = 100;
    const logZoomFactor = Math.log(xDiffInitial / xDiff);
    let bestGuess = minIterations + scalingFactor * logZoomFactor;
    return Math.ceil(Math.min(Math.max(bestGuess, minIterations), maxIterations));
}