import { Grid } from '../../grid/grid';
import { Dot } from './dot-generator';

export interface RasterizedDots {
    colourData: Uint8ClampedArray;      // RGBA, length = grid.size * 4 — directly usable as ImageData
    zData: Float32Array;               // length = grid.size, one z per pixel (NaN = no dot here)
    coverageData: Uint8ClampedArray;   // length = grid.size, alpha/coverage per pixel
}

export class DotRasterizer {

    public rasterize(dots: Dot[], grid: Grid): RasterizedDots {
        const colourData = new Uint8ClampedArray(grid.size * 4);
        const zData = new Float32Array(grid.size).fill(NaN);
        const coverageData = new Uint8ClampedArray(grid.size);

        // smaller z = closer -> drawn last, so painter's algorithm draws largest z (farthest) first.
        const drawOrder = dots.slice().sort((a, b) => b.z - a.z);

        for (const dot of drawOrder) {
            this.rasterizeDot(dot, grid, colourData, zData, coverageData);
        }

        return { colourData, zData, coverageData };
    }

    private rasterizeDot(
        dot: Dot,
        grid: Grid,
        colourData: Uint8ClampedArray,
        zData: Float32Array,
        coverageData: Uint8ClampedArray,
    ): void {
        const [centerCol, centerRow] = grid.mathToPixel(dot.x, dot.y);
        const radiusPixels = dot.r * grid.pixelsPerMathUnit;
        const dotAlpha = dot.colour.a / 255;

        // +1 pixel margin so the antialiased edge band is fully included.
        const colMin = Math.max(0, Math.floor(centerCol - radiusPixels - 1));
        const colMax = Math.min(grid.width - 1, Math.ceil(centerCol + radiusPixels + 1));
        const rowMin = Math.max(0, Math.floor(centerRow - radiusPixels - 1));
        const rowMax = Math.min(grid.height - 1, Math.ceil(centerRow + radiusPixels + 1));

        for (let row = rowMin; row <= rowMax; row++) {
            for (let col = colMin; col <= colMax; col++) {
                const dx = (col + 0.5) - centerCol;
                const dy = (row + 0.5) - centerRow;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // analytic 1px antialiased edge band
                const coverage = this.clamp01(radiusPixels - dist + 0.5);
                const srcAlpha = coverage * dotAlpha;
                if (srcAlpha <= 0) { continue; }

                const index = grid.getIndex(col, row);
                this.blendPixel(index, srcAlpha, dot, colourData, coverageData);
                zData[index] = dot.z;
            }
        }
    }

    private blendPixel(
        index: number,
        srcAlpha: number,
        dot: Dot,
        colourData: Uint8ClampedArray,
        coverageData: Uint8ClampedArray,
    ): void {
        const colourIndex = index * 4;
        const existingAlpha = colourData[colourIndex + 3] / 255;
        const outAlpha = srcAlpha + existingAlpha * (1 - srcAlpha);

        if (outAlpha <= 0) {
            colourData[colourIndex] = 0;
            colourData[colourIndex + 1] = 0;
            colourData[colourIndex + 2] = 0;
            colourData[colourIndex + 3] = 0;
            coverageData[index] = 0;
            return;
        }

        const blend = (srcChannel: number, dstChannel: number): number =>
            (srcChannel * srcAlpha + dstChannel * existingAlpha * (1 - srcAlpha)) / outAlpha;

        colourData[colourIndex] = blend(dot.colour.r, colourData[colourIndex]);
        colourData[colourIndex + 1] = blend(dot.colour.g, colourData[colourIndex + 1]);
        colourData[colourIndex + 2] = blend(dot.colour.b, colourData[colourIndex + 2]);
        colourData[colourIndex + 3] = Math.round(outAlpha * 255);
        coverageData[index] = Math.round(outAlpha * 255);
    }

    private clamp01(value: number): number {
        return Math.max(0, Math.min(1, value));
    }
}
