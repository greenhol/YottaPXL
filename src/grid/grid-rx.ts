import { BehaviorSubject, Observable } from 'rxjs';
import { Grid } from './grid';
import { GridRange } from './grid-range';
import { Resolution } from './resolutions';

const DEFAULT_GRID_RANGE = { xMin: 0, xMax: 1, yCenter: 0 };

export class GridRx extends Grid {

    private _range$ = new BehaviorSubject<GridRange>(DEFAULT_GRID_RANGE);
    public range$: Observable<GridRange> = this._range$;

    constructor(resolution: Resolution, range: GridRange = DEFAULT_GRID_RANGE) {
        super(resolution, range)
    }

    public override updateRange(range: GridRange) {
        super.updateRange(range);
        this._range$.next(range);
    }
}