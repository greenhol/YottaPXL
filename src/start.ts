import { configVersionCheck } from './config/config-version-check';
import { Grid } from './grid/grid';
import { Resolution, resolutionAsString, RESOLUTIONS } from './grid/resolutions';
import { MandelbrotSimple } from './plane/complex-fractal/mandelbrot-simple';
import { Lic } from './plane/lic/lic';
import { Plane } from './plane/plane';
import { InteractionOverlay } from './stage/interactionOverlay';
import { Stage } from './stage/stage';
import { UrlHandler } from './utils/url-handler';

declare const APP_VERSION: string;
declare const APP_NAME: string;

enum PlaneID {
    MANDELBROT = 'MANDELBROT',
    LIC = 'LIC',
}

export class Start {

    private readonly _grid: Grid;
    private  _stage: Stage;
    private _interactionOverlay: InteractionOverlay;
    private _plane: Plane;

    private _urlHandler = new UrlHandler();

    // Header Area
    private _headerArea: HTMLDivElement | null = document.getElementById('header') as HTMLDivElement;
    private _resolutionSelect = document.getElementById('resolutionSelect') as HTMLSelectElement;
    private _exportButton = document.getElementById('exportButton') as HTMLDivElement;
    // Canvas Area
    private _mainDiv = document.getElementById('main') as HTMLDivElement;
    private _htmlCanvas = document.getElementById('canvas') as HTMLCanvasElement;
    private _htmlSvg = document.getElementById('svgOverlay') as HTMLElement;
    // Info Area
    private _infoArea: HTMLDivElement | null = document.getElementById('info') as HTMLDivElement;
    private _mathCoordsArea = document.getElementById('mathCoordsArea') as HTMLSpanElement;
    private _pixelCoordsArea = document.getElementById('pixelCoordsArea') as HTMLSpanElement;
    // Plane Area
    private _planeSelectArea = document.getElementById('planeSelectArea') as HTMLDivElement;
    private _planeSelect = document.getElementById('planeSelect') as HTMLSelectElement;
    private _planeConfigArea = document.getElementById('planeConfigArea') as HTMLDivElement;

    constructor() {
        console.log(`#constructor(Start) - ${APP_NAME} - Version: ${APP_VERSION}`);
        configVersionCheck(APP_VERSION);

        const [width, height] = this._urlHandler.getResolution();
        let resolution = this.initializeResolution(width, height);
        if (!resolution) {
            console.error('#ctor - initial resolution not found!');
            resolution = RESOLUTIONS[0];
        }
        this._grid = new Grid(resolution);

        let planeId = this.initializePlane(PlaneID.LIC);

        window.onload = () => { this.init(planeId) }
    }

    private init(initialPlane: PlaneID) {
        if (this._htmlCanvas == null || this._htmlSvg == null) {
            console.error('Critical: HTML elements not found');
            return;
        }
        this.setHtmlCanvasSize();
        this._interactionOverlay = new InteractionOverlay(this._htmlSvg, this._grid);

        this._stage = new Stage(this._htmlCanvas, this._grid);

        switch (initialPlane) {
            case PlaneID.MANDELBROT: {
                this._plane = new MandelbrotSimple(this._grid);
                break;
            }
            case PlaneID.LIC: {
                this._plane = new Lic(this._grid);
                break;
            }
        }

        this.subscribeToCoordinates();
        this.subscribeToSelection();
        this.subscribeToBusyState();

        this.addResulutionsDropdownEventListener();
        this.addExportButtonClickListener();
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

    private initializePlane(id: PlaneID): PlaneID {
        this._planeSelect.innerHTML = '';
        let selectedPlane: PlaneID = id;

        for (const planeId in PlaneID) {
            const option = document.createElement('option');
            option.label = `${planeId}`;
            option.value = planeId;
            if (planeId == id) {
                selectedPlane = planeId;
                option.selected = true;
            }
            this._planeSelect.appendChild(option);
        };
        return selectedPlane;
    }

    private setHtmlCanvasSize() {
        const width = this._grid.width;
        const height = this._grid.height;
        this._htmlCanvas.width = width;
        this._htmlCanvas.height = height;
        this._htmlCanvas.setAttribute('width', `${width}px`);
        this._htmlCanvas.setAttribute('height', `${height}px`);
        this._htmlSvg.setAttribute('width', `${width}px`);
        this._htmlSvg.setAttribute('height', `${height}px`);
        this.setAreaWidth(this._headerArea, width);
        this.setAreaWidth(this._infoArea, width);
        this.setAreaWidth(this._planeSelectArea, width);
        this.setAreaWidth(this._planeConfigArea, width);
        this._mainDiv.style.setProperty('visibility', `visible`);
    }

    private setAreaWidth(area: HTMLDivElement | null, width: number) {
        if (area != null) {
            area.style.width = `${width + 2}px`;
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
        this._resolutionSelect?.addEventListener('change', (event) => {
            const selectedValue = (event.target as HTMLSelectElement).value;
            const [width, height] = selectedValue.split('x').map(Number);
            console.log(`Selected resolution: ${width}x${height}`);
            this._urlHandler.updateResolution(width, height);
            window.location.reload();
        });
    }

    private addExportButtonClickListener() {
        this._exportButton?.addEventListener('click', (e: PointerEvent) => {
            let filename = prompt('Enter a filename', 'image');
            if (!filename) return;
            filename += '.png';

            const dataURL = this._htmlCanvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = filename;
            link.href = dataURL;
            link.click();
            setTimeout(() => {
                link.remove();
            }, 100);
        });
    }

    private addIterationsEventListener() {
        const input = document.getElementById('iterationsInput') as HTMLInputElement;

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const value = input.valueAsNumber;
                this._plane.setMaxIterations(value);
            }
        });
    }
}