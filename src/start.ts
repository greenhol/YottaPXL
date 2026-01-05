import { Grid } from './grid/grid';
import { MandelbrotSimple } from './plane/mandelbrot-simple';
import { InteractionOverlay } from './stage/interactionOverlay';
import { Stage } from './stage/stage';

declare const APP_VERSION: string;
declare const APP_NAME: string;

const WIDTH: number = 1280;
const HEIGHT: number = 720;

export class Start {

    private _grid: Grid;

    private _infoArea: HTMLElement | null = document.getElementById('info');
    private _mathCoordsArea = document.getElementById('mathCoordsArea');
    private _pixelCoordsArea = document.getElementById('pixelCoordsArea');

    private _stage: Stage;
    private _interactionOverlay: InteractionOverlay;
    private _plane: MandelbrotSimple;

    constructor() {
        console.log(`#constructor(Start) - ${APP_NAME} - Version: ${APP_VERSION}`);
        this._grid = new Grid(WIDTH, HEIGHT);
        window.onload = () => { this.init() }
    }

    private init() {
        const mainDiv = document.getElementById('main') as HTMLDivElement;
        const htmlCanvas = document.getElementById('canvas') as HTMLCanvasElement;
        const htmlSvg = document.getElementById('svgOverlay') as HTMLElement;
        if (htmlCanvas == null || htmlSvg == null) {
            console.error('Critical: HTML elements not found');
            return;
        }
        this.setHtmlCanvasSize(mainDiv, htmlCanvas, htmlSvg);
        this._interactionOverlay = new InteractionOverlay(htmlSvg, this._grid);

        this._stage = new Stage(htmlCanvas, this._grid);
        this._plane = new MandelbrotSimple(this._grid);

        this.subscribeToCoordinates();
        this.subscribeToSelection();
        this.addIterationsEventListener();

        this._stage.setPlane(this._plane);
    }

    private setHtmlCanvasSize(div: HTMLDivElement, canvas: HTMLCanvasElement, svgOverlay: HTMLElement) {
        const width = this._grid.width;
        const height = this._grid.height;
        canvas.width = width;
        canvas.height = height;
        canvas.setAttribute('width', `${width}px`);
        canvas.setAttribute('height', `${height}px`);
        svgOverlay.setAttribute('width', `${width}px`);
        svgOverlay.setAttribute('height', `${height}px`);
        if (this._infoArea != null) {
            this._infoArea.style.width = `${width}px`;
        }
        div.style.setProperty('visibility', `visible`);
    }

    private subscribeToCoordinates() {
        this._interactionOverlay.displayableCoordinates$.subscribe({
            next: (displayableCoordinates) => {
                if (this._mathCoordsArea != null && this._pixelCoordsArea != null) {
                    this._mathCoordsArea.textContent = displayableCoordinates.math;
                    this._pixelCoordsArea.textContent = displayableCoordinates.pixel;
                }
            }
        });
    }

    private subscribeToSelection() {
        this._interactionOverlay.selection$.subscribe({
            next: (selection) => {
                if (selection != null) {
                    console.log(selection);
                    this._plane.updateArea(selection);
                }
            }
        });
    }

    private addIterationsEventListener() {
        const input = document.getElementById('iterationsInput') as HTMLInputElement;

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const value = input.valueAsNumber;
                this._plane.maxIterations = value;
            }
        });
    }
}