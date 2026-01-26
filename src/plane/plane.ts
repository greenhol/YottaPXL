import { BehaviorSubject, Observable } from 'rxjs';
import { Grid } from '../grid/grid';
import { GridRange } from '../grid/grid-range';
import { ModuleConfig } from '../config/module-config';

export interface PlaneConfig {
    gridRange: GridRange;
}

export abstract class Plane {

    private _grid: Grid;

    private _image$ = new BehaviorSubject<ImageDataArray>(new Uint8ClampedArray(0));
    public image$: Observable<ImageDataArray> = this._image$;

    private _busy$ = new BehaviorSubject<boolean>(false);
    public busy$: Observable<boolean> = this._busy$;

    constructor(grid: Grid) {
        this._grid = grid;
    }

    public abstract config: ModuleConfig<PlaneConfig>;

    public abstract name: string;

    public abstract updateGridRange(range: GridRange | null): void;

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

    public onDestroy(): void {
        this.config.save();
    }
}