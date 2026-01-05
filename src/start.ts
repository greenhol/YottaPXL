import { Canvas } from './canvas/canvas';
import { InteractionOverlay } from './overlays/interactionOverlay';
import { MandelbrotSimple } from './plane/mandelbrot-simple';
import { Grid } from './types/grid';

declare const APP_VERSION: string;
declare const APP_NAME: string;

const WIDTH: number = 1280;
const HEIGHT: number = 720;

export class Start {

    private _grid: Grid;

    private _infoArea: HTMLElement | null = document.getElementById('info');
    private _mathCoordsArea = document.getElementById('mathCoordsArea');
    private _pixelCoordsArea = document.getElementById('pixelCoordsArea');

    private _canvas: Canvas;
    private _interactionOverlay: InteractionOverlay;
    private _plane: MandelbrotSimple;

    constructor() {
        console.log(`#constructor(Start) - ${APP_NAME} - Version: ${APP_VERSION}`);
        this._grid = new Grid(WIDTH, HEIGHT);
        window.onload = () => { this.init() }
    }

    private init() {
        const htmlCanvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
        const htmlSvg = document.getElementById('svgOverlay') as HTMLElement;
        if (htmlCanvas == null || htmlSvg == null) {
            console.error('Critical: HTML elements not found');
            return;
        }
        this.setHtmlCanvasSize(htmlCanvas, htmlSvg);
        this._interactionOverlay = new InteractionOverlay(htmlSvg, this._grid);

        this._canvas = new Canvas(htmlCanvas, this._grid);
        this._plane = new MandelbrotSimple(this._grid);

        this.subscribeToCoordinates();
        this.subscribeToSelection();
        this.addIterationsEventListener();

        this.drawCanvas();
    }

    private drawCanvas() {
        this._canvas.draw(this._plane.asImageDataArray());
    }

    private setHtmlCanvasSize(canvas: HTMLCanvasElement, svgOverlay: HTMLElement) {
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
                    this.drawCanvas();
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
                this.drawCanvas();
            }
        });
    }
}