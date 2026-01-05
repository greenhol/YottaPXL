import { BehaviorSubject } from 'rxjs';
import { Grid } from '../types/grid';

const ID_INVALID_RECT = 'invalid-rectangle';
const ID_USER_RECT = 'user-rectangle';
const ID_NORM_RECT = 'norm-rectangle';
const MIN_RECTANGLE_WIDTH = 60;

export interface DisplayableCoordinates {
    pixel: string,
    math: string,
}

export interface RectangleCoordinates {
    x1: number,
    y1: number,
    x2: number,
    y2: number,
}

interface Point {
    x: number;
    y: number;
}

interface Rectangles {
    user: SVGGElement,
    norm: SVGGElement,
}

export class InteractionOverlay {

    public displayableCoordinates$ = new BehaviorSubject<DisplayableCoordinates>({ pixel: '', math: '' });
    public selection$ = new BehaviorSubject<RectangleCoordinates | null>(null);

    private _overlay: HTMLElement;
    private _grid: Grid;

    private _p1: Point | null = null;
    private _p2: Point | null = null;
    private _invalidRect: SVGGElement | null = null;
    private _validRect: Rectangles | null = null;
    private _frozen: boolean = false;

    constructor(overlay: HTMLElement, grid: Grid) {
        this._overlay = overlay;
        this._grid = grid;
        this.addSvgCss();

        this.addEventListeners();
    }

    private addSvgCss() {
        var sheet = window.document.styleSheets[0];
        sheet.insertRule(`#${ID_INVALID_RECT} { fill: none; stroke: #ff0000ff; stroke-width: 1; }`, sheet.cssRules.length);
        sheet.insertRule(`#${ID_USER_RECT} { fill: none; stroke: #90d5ffff; stroke-width: 1; }`, sheet.cssRules.length);
        sheet.insertRule(`#${ID_NORM_RECT} { fill: #90d5ff88; stroke: none; }`, sheet.cssRules.length);
    }

    private addEventListeners() {
        this._overlay.addEventListener('mousedown', (e) => { if (!this._frozen) this.onMouseDown(e) });
        this._overlay.addEventListener('mousemove', (e) => { if (!this._frozen) this.onMouseMove(e) });
        this._overlay.addEventListener('mouseup', (e) => { if (!this._frozen) this.onMouseUp(e) });
        this._overlay.addEventListener('mouseleave', () => { if (!this._frozen) this.onMouseLeave() });
        this._overlay.addEventListener('wheel', (e) => { if (!this._frozen) this.onMouseWheel(e) });
    }

    private onMouseDown(e: MouseEvent) {
        this._p1 = { x: e.offsetX, y: e.offsetY };
    }

    private onMouseMove(e: MouseEvent) {
        if (!this._p1) {
            this.emitDisplayableCoordinates({ x: e.offsetX, y: e.offsetY });
            return;
        }
        this._p2 = { x: e.offsetX, y: e.offsetY };
        this.evaluateRect(this._p1, this._p2);
    }

    private onMouseUp(e: MouseEvent) {
        if (this._validRect != null) {
            const selection = this.getMathCoordinatesFromRectangle(this._validRect.norm);
            this.emitSelection(selection);
        } else if (this._p1 != null && this._p2 == null) {
            this.emitFromPosition(e.offsetX, e.offsetY, 1);
            return;
        }
        this.resetAllSelections();
        this.emitDisplayableCoordinates();
    }

    private onMouseLeave() {
        this.resetAllSelections();
        this.emitDisplayableCoordinates();
    }

    private onMouseWheel(e: WheelEvent) {
        e.preventDefault();

        this.removeInvalidRect();
        this.removeValidRect();

        const factor = e.deltaY < 0 ? 0.25 : 4;
        this.emitFromPosition(e.offsetX, e.offsetY, factor);
    }

    private emitFromPosition(x: number, y: number, factor: number) {
        this.freeze();
        const newWidth = this._grid.width * factor;
        const newHeight = this._grid.height * factor;
        this._p1 = { x: x - newWidth / 2, y: y - newHeight / 2 };
        this._p2 = { x: x + newWidth / 2, y: y + newHeight / 2 };
        this.createValidRect(this._p1, newWidth, newHeight);

        if (this._validRect != null) {
            const selection = this.getMathCoordinatesFromRectangle(this._validRect.norm);
            setTimeout(() => {
                this.unFreeze();
                this.resetAllSelections();
                this.emitSelection(selection);
            }, 250);
        }
    }

    private freeze() {
        this._frozen = true;
    }

    private unFreeze() {
        this._frozen = false;
    }

    private resetAllSelections() {
        this._p1 = null;
        this._p2 = null;
        this.removeInvalidRect();
        this.removeValidRect();
    }

    private removeInvalidRect() {
        if (this._invalidRect != null) {
            this._overlay.removeChild(this._invalidRect);
            this._invalidRect = null;
        }
    }

    private removeValidRect() {
        if (this._validRect != null) {
            this._overlay.removeChild(this._validRect.user);
            this._overlay.removeChild(this._validRect.norm);
            this._validRect = null;
        }
    }

    private evaluateRect(p1: Point, p2: Point) {
        const p: Point = { x: Math.min(p1.x, p2.x), y: Math.min(p1.y, p2.y) }
        const width = Math.abs(p1.x - p2.x);
        const height = Math.abs(p1.y - p2.y);
        if (width < MIN_RECTANGLE_WIDTH) {
            this.removeValidRect();
            if (this._invalidRect == null) {
                this.createInvalidRect(p, width, height);
            } else {
                this.updateInvalidRect(this._invalidRect, p, width, height);
            }
            this.emitDisplayableCoordinates();
        } else {
            this.removeInvalidRect();
            if (this._validRect == null) {
                this.createValidRect(p, width, height);
            } else {
                this.updateValidRect(this._validRect, p, width, height);
            }
            this.emitDisplayableCoordinates();
        }
    }

    private createInvalidRect(p: Point, width: number, height: number) {
        const userRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        userRect.id = ID_INVALID_RECT;
        userRect.setAttribute('x', p.x.toString());
        userRect.setAttribute('y', p.y.toString());
        userRect.setAttribute('width', width.toString());
        userRect.setAttribute('height', height.toString());

        this._invalidRect = userRect
        this._overlay.appendChild(this._invalidRect);
    }

    private updateInvalidRect(rect: SVGGElement, p: Point, width: number, height: number) {
        rect.setAttribute('x', p.x.toString());
        rect.setAttribute('y', p.y.toString());
        rect.setAttribute('width', width.toString());
        rect.setAttribute('height', height.toString());
    }

    private createValidRect(p: Point, width: number, height: number) {
        const userRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        userRect.id = ID_USER_RECT;
        userRect.setAttribute('x', p.x.toString());
        userRect.setAttribute('y', p.y.toString());
        userRect.setAttribute('width', width.toString());
        userRect.setAttribute('height', height.toString());

        const [normP, normWidth, normHeight] = this.evaluateNormRect(p, width, height);
        const normRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        normRect.id = ID_NORM_RECT;
        normRect.setAttribute('x', normP.x.toString());
        normRect.setAttribute('y', normP.y.toString());
        normRect.setAttribute('width', normWidth.toString());
        normRect.setAttribute('height', normHeight.toString());

        this._validRect = { user: userRect, norm: normRect }
        this._overlay.appendChild(this._validRect.user);
        this._overlay.appendChild(this._validRect.norm);
    }

    private updateValidRect(rect: Rectangles, p: Point, width: number, height: number) {
        rect.user.setAttribute('x', p.x.toString());
        rect.user.setAttribute('y', p.y.toString());
        rect.user.setAttribute('width', width.toString());
        rect.user.setAttribute('height', height.toString());

        const [normP, normWidth, normHeight] = this.evaluateNormRect(p, width, height);
        rect.norm.setAttribute('x', normP.x.toString());
        rect.norm.setAttribute('y', normP.y.toString());
        rect.norm.setAttribute('width', normWidth.toString());
        rect.norm.setAttribute('height', normHeight.toString());
    }

    private evaluateNormRect(p: Point, width: number, height: number): [Point, number, number] {
        const normHeight = width / this._grid.ratio;
        const normP: Point = {
            x: p.x,
            y: p.y + height / 2 - normHeight / 2,
        }
        return [normP, width, normHeight];
    }

    private emitSelection(rect: RectangleCoordinates) {
        this.selection$.next(rect);
    }

    private emitDisplayableCoordinates(p1: Point | null = null) {
        if (this._validRect != null) {
            this.displayableCoordinates$.next({
                pixel: this.rectangleCoordinatesToString(this.getPixelCoordinatesFromRectangle(this._validRect.norm)),
                math: this.rectangleCoordinatesToString(this.getMathCoordinatesFromRectangle(this._validRect.norm), true),
            });
        } else if (this._invalidRect != null) {
            this.displayableCoordinates$.next({
                pixel: this.rectangleCoordinatesToString(this.getPixelCoordinatesFromRectangle(this._invalidRect)),
                math: this.rectangleCoordinatesToString(this.getMathCoordinatesFromRectangle(this._invalidRect), true),
            });
        } else if (p1 != null) {
            this.displayableCoordinates$.next({
                pixel: `(${p1.x}, ${p1.y})`,
                math: this.getMathCoordinatesFromPoint(p1),
            });
        }
        else {
            this.displayableCoordinates$.next({ pixel: ``, math: ``, });
        }
    }

    private getPixelCoordinatesFromRectangle(rect: SVGGElement): RectangleCoordinates {
        const pixelX = parseInt(rect.getAttribute('x') || '0');
        const pixelY = parseInt(rect.getAttribute('y') || '0');
        const width = parseInt(rect.getAttribute('width') || '0');
        const height = parseInt(rect.getAttribute('height') || '0');

        return {
            x1: pixelX,
            y1: pixelY,
            x2: pixelX + width,
            y2: pixelY + height,
        }
    }

    private getMathCoordinatesFromRectangle(rect: SVGGElement): RectangleCoordinates {
        const pixelX = parseInt(rect.getAttribute('x') || '0');
        const pixelY = parseInt(rect.getAttribute('y') || '0');
        const width = parseInt(rect.getAttribute('width') || '0');
        const height = parseInt(rect.getAttribute('height') || '0');
        const [mathX1, mathY1] = this._grid.pixelToMath(pixelX, pixelY);
        const [mathX2, mathY2] = this._grid.pixelToMath(pixelX + width, pixelY + height);

        return {
            x1: mathX1,
            y1: mathY1,
            x2: mathX2,
            y2: mathY2,
        }
    }

    private rectangleCoordinatesToString(coords: RectangleCoordinates, round: boolean = false): string {
        if (round) {
            const x1 = coords.x1.toFixed(12);
            const y1 = coords.y1.toFixed(12);
            const x2 = coords.x2.toFixed(12);
            const y2 = coords.y2.toFixed(12);
            return `(${x1}, ${y1}) => (${x2}, ${y2})`;
        } else {
            return `(${coords.x1}, ${coords.y1}) => (${coords.x2}, ${coords.y2})`;
        }
    }

    private getMathCoordinatesFromPoint(p: Point): string {
        const [mathX1, mathY1] = this._grid.pixelToMath(p.x, p.y);
        const x1 = mathX1.toFixed(12);
        const y1 = mathY1.toFixed(12);
        return `(${x1}, ${y1})`;
    }
}