import { GridReader } from '../../../grid/grid-reader';

export function upscaleNoise(sourceGrid: GridReader, sourceData: Float64Array, targetGrid: GridReader, scale: number): Float64Array {
    if (scale == 1) return sourceData;
    const data = new Float64Array(targetGrid.size);
    for (let baseRow = 0; baseRow < sourceGrid.height; baseRow++) {
        for (let baseCol = 0; baseCol < sourceGrid.width; baseCol++) {
            const value = sourceData[sourceGrid.getIndex(baseCol, baseRow)];
            for (let i = 0; i < scale; i++) {
                for (let j = 0; j < scale; j++) {
                    const row = baseRow * scale + j;
                    const col = baseCol * scale + i;
                    if (row < targetGrid.height && col < targetGrid.width) {
                        data[targetGrid.getIndex(col, row)] = value;
                    }
                }
            }
        }
    }
    return data;
}