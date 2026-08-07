import { GridReader } from './grid-reader';

export interface GridWithoutRangeBlueprint {
    width: number,
    height: number,
}

export class GridWithoutRange implements GridReader {
    private _width: number;
    private _height: number;

    public static copyWithoutRange(blueprint: GridWithoutRangeBlueprint) {
        return new GridWithoutRange(blueprint.width, blueprint.height);
    }

    constructor(width: number, height: number) {
        this._width = width;
        this._height = height;
    }

    public getIndex(col: number, row: number): number {
        return row * this._width + col;
    }

    public get width(): number { return this._width; }

    public get height(): number { return this._height; }

    public get size(): number { return this._width * this._height; }

    public get ratio(): number { return this._width / this._height; }

    public toString(): string {
        return `width: ${this.width}, height:${this.height} -> size ${this.size}`;
    }

    public get withoutRangeBlueprint(): GridWithoutRangeBlueprint {
        return {
            width: this.width,
            height: this.height,
        };
    }
}