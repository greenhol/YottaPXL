import { Subscription } from 'rxjs';
import { Grid } from '../grid/grid';
import { Plane } from '../plane/plane';
import { Canvas } from './canvas';

export class Stage {

    private _canvas: Canvas;
    private _subscription: Subscription | null = null;

    constructor(canvas: HTMLCanvasElement, grid: Grid) {
        this._canvas = new Canvas(canvas, grid);
    }

    public draw(imageData: ImageDataArray) {
        this._canvas.draw(imageData);
    }

    public setPlane(plane: Plane) {
        this._subscription?.unsubscribe();
        this._subscription = plane.image$.subscribe(image => {
            console.log(`#setPlane - plane.image subscription new Image of length ${image.length}`);
            this._canvas.draw(image)
        });
    }
}