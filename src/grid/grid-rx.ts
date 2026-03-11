import { BehaviorSubject, Observable } from 'rxjs';
import { Grid } from './grid';
import { createDefaultGridRange, GridRange } from './grid-range';
import { Resolution } from './resolutions';

export class GridRx extends Grid {

    private _range$ = new BehaviorSubject<GridRange>(createDefaultGridRange());
    public range$: Observable<GridRange> = this._range$;

    constructor(resolution: Resolution, range: GridRange = createDefaultGridRange()) {
        super(resolution, range)
    }

    public override updateRange(range: GridRange) {
        super.updateRange(range);
        this._range$.next(range);
    }
}