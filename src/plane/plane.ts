import { BehaviorSubject, Observable } from 'rxjs';
import { Initializable } from '../../shared';
import { ModuleConfig } from '../../shared/config';
import { Grid } from '../grid/grid';
import { GridRange, GridRangeSerialized } from '../grid/grid-range';
import { RGB } from '../types';
import { PROGRESS_INIT, ProgressUpdate } from '../worker/progress';

export interface PlaneConfig {
    gridRange: GridRangeSerialized;
}

export interface ProgressDisplay {
    percentage: number;
    estimate: number;
    step: string;
}

export abstract class Plane implements Initializable {

    private _grid: Grid;

    private _image$ = new BehaviorSubject<ImageDataArray>(new Uint8ClampedArray(0));
    public image$: Observable<ImageDataArray> = this._image$;

    private _busy$ = new BehaviorSubject<ProgressDisplay | null>(null);
    public busy$: Observable<ProgressDisplay | null> = this._busy$;

    constructor(grid: Grid) {
        this._grid = grid;
    }

    public abstract config: ModuleConfig<PlaneConfig>;

    public init(): void {
        console.log(this.config.data);
        this.updateGridRange(GridRangeSerialized.deserialize(this.config.data.gridRange));
    }

    public abstract refresh(): void;

    public updateGridRange(range: GridRange) {
        this.config.data.gridRange = GridRange.serialize(range);
        this.config.setInfo('Grid Range as String', GridRange.toString(range));
        this.grid.updateRange(GridRangeSerialized.deserialize(this.config.data.gridRange));
        this.refresh();
    }

    public resetGridRange() {
        this.config.reset('gridRange');
        this.grid.updateRange(GridRangeSerialized.deserialize(this.config.data.gridRange));
        this.refresh();
    }

    public resetConfiguration() {
        this.config.reset();
        this.grid.updateRange(GridRangeSerialized.deserialize(this.config.data.gridRange));
        this.refresh();
    }

    public get grid(): Grid {
        return this._grid;
    }

    public updateImage(image: ImageDataArray) {
        this._image$.next(image);
    }

    public setPixel(imageData: Uint8ClampedArray, index: number, color: RGB) {
        const pixelIndex = index * 4;
        imageData[pixelIndex] = color.r;     // R
        imageData[pixelIndex + 1] = color.g; // G
        imageData[pixelIndex + 2] = color.b; // B
        imageData[pixelIndex + 3] = 255;     // A (opaque)
    }

    public setIdle() {
        this._busy$.next(null);
    }

    public resetProgress() {
        this.setProgress(PROGRESS_INIT);
    }

    public setProgress(progress: ProgressUpdate, step: string = "") {
        this._busy$.next({ percentage: progress.percentage, estimate: progress.estimate, step: step });
    }

    public onDestroy(): void {
        this.config.save();
    }
}
