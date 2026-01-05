import { BehaviorSubject, Observable } from 'rxjs';
import { Grid } from '../grid/grid';

export abstract class Plane {

    private _grid: Grid;
    private _image$= new BehaviorSubject<ImageDataArray>(new Uint8ClampedArray(0));

    public image$: Observable<ImageDataArray> = this._image$;
    
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
}