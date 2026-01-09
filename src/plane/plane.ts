import { BehaviorSubject, Observable } from 'rxjs';
import { Grid } from '../grid/grid';

export abstract class Plane {

    private _grid: Grid;

    private _image$ = new BehaviorSubject<ImageDataArray>(new Uint8ClampedArray(0));
    public image$: Observable<ImageDataArray> = this._image$;

    private _busy$ = new BehaviorSubject<boolean>(false);
    public busy$: Observable<boolean> = this._busy$;
    
    constructor(grid: Grid) {
        this._grid = grid;
    }

    public abstract name: string;

    public get grid(): Grid {
        return this._grid;
    }

    public updateImage(image: ImageDataArray) {
        this._image$.next(image);
    }

    public setIdle() {
        this._busy$.next(false);
    }

    public setBusy() {
        this._busy$.next(true);
    }
}