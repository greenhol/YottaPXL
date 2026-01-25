import { Subscription } from 'rxjs';
import { configVersionCheck } from './config/config-version-check';
import { ModuleConfig } from './config/module-config';
import { Grid } from './grid/grid';
import { gridRangeFromString, gridRangeToString } from './grid/grid-range';
import { FALLBACK_RESOLUTION, Resolution, resolutionAsString, RESOLUTIONS } from './grid/resolutions';
import { MandelbrotSimple } from './plane/complex-fractal/mandelbrot-simple';
import { Lic } from './plane/lic/lic';
import { Noise } from './plane/noise/noise';
import { Plane } from './plane/plane';
import { InteractionOverlay, ShiftDirection } from './stage/interaction-overlay';
import { Stage } from './stage/stage';
import { UrlHandler } from './utils/url-handler';

declare const APP_VERSION: string;
declare const APP_NAME: string;

enum PlaneID {
    MANDELBROT = 'MANDELBROT',
    NOISE = 'NOISE',
    LIC = 'LIC',
}

interface MainConfig {
    currentPlaneId: number,
}

export class Start {

    private _config: ModuleConfig<MainConfig>;

    private readonly _grid: Grid;
    private _stage: Stage;
    private _interactionOverlay: InteractionOverlay;
    private _plane: Plane | null = null;

    private _urlHandler = new UrlHandler();

    // Header Area
    private _headerArea: HTMLDivElement | null = document.getElementById('header') as HTMLDivElement;
    private _resolutionSelect = document.getElementById('resolutionSelect') as HTMLSelectElement;
    private _exportButton = document.getElementById('exportButton') as HTMLDivElement;
    // Canvas Area
    private _mainDiv = document.getElementById('main') as HTMLDivElement;
    private _htmlCanvas = document.getElementById('canvas') as HTMLCanvasElement;
    private _htmlSvg = document.getElementById('svgOverlay') as HTMLElement;
    // Range Area
    private _rangeArea: HTMLDivElement | null = document.getElementById('rangeArea') as HTMLDivElement;
    private _mathCoordsArea = document.getElementById('mathCoordsArea') as HTMLSpanElement;
    private _pixelCoordsArea = document.getElementById('pixelCoordsArea') as HTMLSpanElement;
    private _rangeInput = document.getElementById('rangeInput') as HTMLInputElement;
    // Plane Area
    private _planeSelectArea = document.getElementById('planeSelectArea') as HTMLDivElement;
    private _planeSelect = document.getElementById('planeSelect') as HTMLSelectElement;
    private _planeConfigArea = document.getElementById('planeConfigArea') as HTMLDivElement;

    // subscriptions
    private _busySubscription: Subscription | null = null;
    private _selectionSubscription: Subscription | null = null;

    constructor() {
        console.log(`#constructor(Start) - ${APP_NAME} - Version: ${APP_VERSION}`);
        configVersionCheck(APP_VERSION);
        this._config = new ModuleConfig<MainConfig>({ currentPlaneId: 0 }, 'mainConfig');

        const [width, height] = this._urlHandler.getResolution();
        let resolution = this.initializeResolution(width, height);
        if (!resolution) {
            console.error('#ctor - initial resolution not found!');
            resolution = FALLBACK_RESOLUTION;
        }
        this._grid = new Grid(resolution);

        let planeId = this.initializePlaneSelect();

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

        this.switchPlane(initialPlane);

        this.subscribeToCoordinates();
        this.subscribeToRange();
        this.addResulutionsDropdownEventListener();
        this.addPlaneDropdownEventListener();
        this.addExportButtonClickListener();
        this.addSetRangeButtonClickListener();
        this.addIterationsEventListener(); // ToDo: Only applicable to Mandelbrot?!
        this.handlePhysicalKeyboardEvents();
    }

    private switchPlane(planeId: PlaneID) {
        this._plane?.onDestroy();
        switch (planeId) {
            case PlaneID.MANDELBROT: {
                this._config.data.currentPlaneId = 0;
                this._plane = new MandelbrotSimple(this._grid);
                break;
            }
            case PlaneID.NOISE: {
                this._config.data.currentPlaneId = 1;
                this._plane = new Noise(this._grid);
                break;
            }
            case PlaneID.LIC: {
                this._config.data.currentPlaneId = 2;
                this._plane = new Lic(this._grid);
                break;
            }
        }
        this.subscribeToBusyState();
        this.subscribeToSelection();
        if (this._plane != null) {
            this._stage.setPlane(this._plane);
        } else {
            console.error('Plane not initialized');
        }
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

    private initializePlaneSelect(): PlaneID {
        this._planeSelect.innerHTML = '';
        let selectedPlane: PlaneID = this.getPlaneIdFromConfig();

        for (const planeId in PlaneID) {
            const option = document.createElement('option');
            option.label = `${planeId}`;
            option.value = planeId;
            if (planeId == selectedPlane) {
                option.selected = true;
            }
            this._planeSelect.appendChild(option);
        };
        return selectedPlane;
    }

    private getPlaneIdFromConfig(): PlaneID {
        switch (this._config.data.currentPlaneId) {
            case 1: return PlaneID.NOISE;
            case 2: return PlaneID.LIC;
            default: return PlaneID.MANDELBROT;
        }
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
        this.setAreaWidth(this._rangeArea, width);
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

    private subscribeToRange() {
        this._grid.range$.subscribe({
            next: (range) => { this._rangeInput.value = gridRangeToString(range) }
        });
    }

    private subscribeToSelection() {
        this._selectionSubscription?.unsubscribe();
        this._selectionSubscription = this._interactionOverlay.selectedRange$.subscribe({
            next: (selection) => { this._plane?.updateGridRange(selection) }
        });
    }

    private subscribeToBusyState() {
        this._busySubscription?.unsubscribe();
        if (this._plane != null) {
            this._busySubscription = this._plane.busy$.subscribe({
                next: (busy) => {
                    const busyIndicator = document.getElementById('busyIndicator') as HTMLDivElement;
                    if (busy) {
                        busyIndicator.className = 'busyIndicator--busy';
                    } else {
                        busyIndicator.className = 'busyIndicator--idle';
                    }
                }
            });
        } else {
            console.error('#subscribeToBusyState - unexpected _plane is null');
        }
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

    private addPlaneDropdownEventListener() {
        this._planeSelect?.addEventListener('change', (event) => {
            const selectedValue = (event.target as HTMLSelectElement).value;
            console.log(`Selected plane: ${selectedValue}`);
            switch (selectedValue) {
                case PlaneID.MANDELBROT: {
                    this.switchPlane(PlaneID.MANDELBROT);
                    break;
                }
                case PlaneID.NOISE: {
                    this.switchPlane(PlaneID.NOISE);
                    break;
                }
                case PlaneID.LIC: {
                    this.switchPlane(PlaneID.LIC);
                    break;
                }
                default: {
                    console.warn(`Invalid plane ID: ${selectedValue}`);
                    break;
                }
            }
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

    private addSetRangeButtonClickListener() {
        const setRangeButton = document.getElementById('setRangeButton') as HTMLDivElement;
        setRangeButton?.addEventListener('click', (e: PointerEvent) => {
            const rangeInputText: string = this._rangeInput.value;
            const newRange = gridRangeFromString(rangeInputText);
            if (newRange !== null) {
                this._interactionOverlay.selectRange(newRange);
            }
        });

        const resetRangeButton = document.getElementById('resetRangeButton') as HTMLDivElement;
        resetRangeButton?.addEventListener('click', (e: PointerEvent) => {
            if (this._plane != null) {
                this._plane.updateGridRange(null);
            } else {
                console.error('#subscribeToBusyState - unexpected _plane is null');
            }
        });
    }

    private addIterationsEventListener() {
        const input = document.getElementById('iterationsInput') as HTMLInputElement;
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (this._plane != null) {
                    const value = input.valueAsNumber;
                    this._plane.setMaxIterations(value);
                } else {
                    console.error('#subscribeToBusyState - unexpected _plane is null');
                }
            }
        });
    }

    private handlePhysicalKeyboardEvents() {
        document.addEventListener(
            "keydown",
            (event) => {
                const activeElement = document.activeElement;
                if (activeElement === null || (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA' && activeElement.tagName !== 'SELECT')) {
                    this.handleKeyPress(event.key);
                }
            },
            false,
        );
    }

    private handleKeyPress(event: string) {
        switch (event) {
            case 'ArrowUp': { this._interactionOverlay.shiftRange(ShiftDirection.UP) } break;
            case 'ArrowDown': { this._interactionOverlay.shiftRange(ShiftDirection.DOWN) } break;
            case 'ArrowLeft': { this._interactionOverlay.shiftRange(ShiftDirection.LEFT) } break;
            case 'ArrowRight': { this._interactionOverlay.shiftRange(ShiftDirection.RIGHT) } break;
            case 'Escape': { this._plane?.updateGridRange(null) } break;
        }
    }
}