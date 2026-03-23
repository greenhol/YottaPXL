import { BehaviorSubject, Observable } from 'rxjs';
import { Initializable, ModuleConfig } from '../../shared';
import { Grid } from '../grid/grid';
import { GridRange } from '../grid/grid-range';

export interface PlaneConfig {
    gridRange: GridRange;
}

export interface Progress {
    percentage: number;
    step: string;
}

export abstract class Plane implements Initializable {

    private _grid: Grid;

    private _image$ = new BehaviorSubject<ImageDataArray>(new Uint8ClampedArray(0));
    public image$: Observable<ImageDataArray> = this._image$;

    private _busy$ = new BehaviorSubject<Progress | null>(null);
    public busy$: Observable<Progress | null> = this._busy$;

    constructor(grid: Grid) {
        this._grid = grid;
    }

    public abstract config: ModuleConfig<PlaneConfig>;

    public abstract init(): void;

    public abstract refresh(): void;

    public updateGridRange(range: GridRange) {
        this.config.data.gridRange = range;
        this.grid.updateRange(this.config.data.gridRange);
        this.refresh();
    }

    public resetConfiguration() {
        this.config.reset();
        this.grid.updateRange(this.config.data.gridRange);
        this.refresh();
    }

    public get grid(): Grid {
        return this._grid;
    }

    public updateImage(image: ImageDataArray) {
        this._image$.next(image);
    }

    public setIdle() {
        this._busy$.next(null);
    }

    public setProgress(progress: number, step: string = "") {
        this._busy$.next({ percentage: progress, step: step });
    }

    public onDestroy(): void {
        this.config.save();
    }
}