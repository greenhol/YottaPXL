import { Grid } from './grid';
import { Resolution } from './resolutions';

export function createGridWithBuffer(grid: Grid, buffer: number): Grid {
    const resolution = resolutionWithBuffer(grid.resolution, buffer);
    const newGridRangeFactor = resolution.width / grid.resolution.width;
    const mathRange = grid.mathRange;
    const [cx, cy] = grid.mathCenter;
    const newGrid = new Grid(resolution);
    newGrid.setRange(cx - mathRange / 2 * newGridRangeFactor, cx + mathRange / 2 * newGridRangeFactor, cy);
    return newGrid;
}

function resolutionWithBuffer(resolution: Resolution, buffer: number): Resolution {
    return {
        width: resolution.width + 2 * buffer,
        height: resolution.height + 2 * buffer,
        description: `${resolution.description} + buffer:${buffer}`,
    }
}