export interface GridReader {
    getIndex(col: number, row: number): number;
    width: number;
    height: number;
    size: number;
    ratio: number;
}