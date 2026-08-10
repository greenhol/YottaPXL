export function shapeIterationCountForColour(iterationCount: number, maxIterations: number): number {
    const logCount = Math.log(iterationCount + 1);
    const logMax = Math.log(maxIterations + 1);
    return (logCount / logMax) * maxIterations;
}