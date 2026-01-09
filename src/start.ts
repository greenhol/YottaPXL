import { Grid } from './grid/grid';
import { Resolution, resolutionAsString, RESOLUTIONS } from './grid/resolutions';
import { MandelbrotSimple } from './plane/mandelbrot-simple';
import { InteractionOverlay } from './stage/interactionOverlay';
import { Stage } from './stage/stage';
import { UrlHandler } from './utils/url-handler';

declare const APP_VERSION: string;
declare const APP_NAME: string;

export class Start {

    private _grid: Grid;
    private _stage: Stage;
    private _interactionOverlay: InteractionOverlay;
    private _plane: MandelbrotSimple;

    private _urlHandler = new UrlHandler();

    private _resolutionSelect = document.getElementById('resolutionSelect') as HTMLSelectElement;
    private _infoArea: HTMLElement | null = document.getElementById('info') as HTMLDivElement;
    private _mathCoordsArea = document.getElementById('mathCoordsArea') as HTMLSpanElement;
    private _pixelCoordsArea = document.getElementById('pixelCoordsArea') as HTMLSpanElement;

    constructor() {
        console.log(`#constructor(Start) - ${APP_NAME} - Version: ${APP_VERSION}`);
        const [width, height] = this._urlHandler.getResolution();
        let initialResolution = this.initializeResolution(width, height);
        if (!initialResolution) {
            console.error('#ctor - initial resolution not found!');
            initialResolution = RESOLUTIONS[0];
        }
        this._grid = new Grid(initialResolution);
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
        this.subscribeToBusyState();

        this.addResulutionsDropdownEventListener();
        this.addIterationsEventListener();

        this._stage.setPlane(this._plane);
    }

    private initializeResolution(width: number, height: number): Resolution | null {
        this._resolutionSelect.innerHTML = '';
        let selectedResolution: Resolution | null = null;

        for (const resolution of RESOLUTIONS) {
            const option = document.createElement('option');
            option.label = `${resolution.description} - ${resolution.width}x${resolution.height}`;
            option.value = resolutionAsString(resolution);
            if (resolution.width == width && resolution.height == height) {
                selectedResolution = resolution;
                option.selected = true;
            }
            this._resolutionSelect.appendChild(option);
        };
        return selectedResolution;
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

    private subscribeToBusyState() {
        this._plane.busy$.subscribe({
            next: (busy) => {
                const busyIndicator = document.getElementById('busyIndicator') as HTMLDivElement;
                if (busy) {
                    busyIndicator.className = 'busyIndicator--busy';
                } else {
                    busyIndicator.className = 'busyIndicator--idle';
                }
            }
        });
    }

    private addResulutionsDropdownEventListener() {
        this._resolutionSelect?.addEventListener("change", (event) => {
            const selectedValue = (event.target as HTMLSelectElement).value;
            const [width, height] = selectedValue.split("x").map(Number);
            console.log(`Selected resolution: ${width}x${height}`);
            this._urlHandler.updateResolution(width, height);
            window.location.reload();
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