import { Grid } from '../types/grid';

export class Canvas {

    private _canvas: HTMLCanvasElement;
    private _grid: Grid;

    constructor(canvas: HTMLCanvasElement, grid: Grid) {
        this._canvas = canvas;
        this._grid = grid;
    }

    draw(imageData: ImageDataArray) {
        const context = this._canvas.getContext('2d');
        if (!context) {
            throw new Error('Could not get 2D context');
        }

        const imageDataObject = new ImageData(imageData, this._grid.width, this._grid.height);
        context.putImageData(imageDataObject, 0, 0);
    }
}