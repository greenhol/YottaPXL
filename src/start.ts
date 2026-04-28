import { Subscription, timer } from 'rxjs';
import { idGenerator } from '../shared';
import { ConfigOverlay, configVersionCheck, ModuleConfig } from '../shared/config';
import { gridRangeFromString, gridRangeToString } from './grid/grid-range';
import { GridRx } from './grid/grid-rx';
import { FALLBACK_RESOLUTION, Resolution, resolutionAsString, RESOLUTIONS } from './grid/resolutions';
import { ColorBlending } from './plane/color/color-blending';
import { Gradient } from './plane/color/gradient';
import { MandelbrotCombinedID } from './plane/complex-fractal/mandelbrot-combined-id';
import { MandelbrotCombinedIV } from './plane/complex-fractal/mandelbrot-combined-iv';
import { MandelbrotDistance } from './plane/complex-fractal/mandelbrot-distance';
import { MandelbrotIterations } from './plane/complex-fractal/mandelbrot-iterations';
import { MandelbrotVector } from './plane/complex-fractal/mandelbrot-vector';
import { Noise } from './plane/noise/noise';
import { Plane } from './plane/plane';
import { PLANE_TYPES, PlaneId, VALID_PLANE_IDS } from './plane/plane-types';
import { Charges } from './plane/vector-fields/charges';
import { Weather } from './plane/vector-fields/weather';
import { InteractionOverlay, ShiftDirection } from './stage/interaction-overlay';
import { Stage } from './stage/stage';
import { UrlHandler } from './utils/url-handler';

declare const APP_NAME: string;
declare const APP_VERSION: string;

interface MainConfig {
    currentPlaneId: PlaneId,
}

export class Start {

    private _config: ModuleConfig<MainConfig>;

    private readonly _grid: GridRx;
    private _stage: Stage;
    private _interactionOverlay: InteractionOverlay;
    private _plane: Plane | null = null;
    private _configOverlay: ConfigOverlay;

    private _urlHandler = new UrlHandler();

    // Header Area
    private _headerArea: HTMLDivElement | null = document.getElementById('header') as HTMLDivElement;
    private _resolutionSelect = document.getElementById('resolutionSelect') as HTMLSelectElement;
    private _exportButton = document.getElementById('exportButton') as HTMLDivElement;
    private _planeSelect = document.getElementById('planeSelect') as HTMLSelectElement;
    // Canvas Area
    private _mainDiv = document.getElementById('main') as HTMLDivElement;
    private _htmlCanvas = document.getElementById('canvas') as HTMLCanvasElement;
    private _htmlSvg = document.getElementById('svgOverlay') as HTMLElement;
    // Range Area
    private _rangeArea: HTMLDivElement | null = document.getElementById('rangeArea') as HTMLDivElement;
    private _mathCoordsArea = document.getElementById('mathCoordsArea') as HTMLSpanElement;
    private _pixelCoordsArea = document.getElementById('pixelCoordsArea') as HTMLSpanElement;
    private _rangeInput = document.getElementById('rangeInput') as HTMLInputElement;

    // subscriptions
    private _busySubscription: Subscription | null = null;
    private _selectionSubscription: Subscription | null = null;

    constructor() {
        console.log(`#constructor(Start) - ${APP_NAME} - Version: ${APP_VERSION}`);
        configVersionCheck();
        this._config = new ModuleConfig<MainConfig>({ currentPlaneId: 'MANDELBROT_ITERATIONS' }, 'mainConfig' + APP_NAME);

        const [width, height] = this._urlHandler.getResolution();
        let resolution = this.initializeResolution(width, height);
        if (!resolution) {
            console.error('#ctor - initial resolution not found!');
            resolution = FALLBACK_RESOLUTION;
        }
        this._grid = new GridRx(resolution);

        let planeId = this.initializePlaneSelect();

        window.onload = () => { this.init(planeId); };
    }

    private init(initialPlane: PlaneId) {
        if (this._htmlCanvas == null || this._htmlSvg == null) {
            console.error('Critical: HTML elements not found');
            return;
        }
        this.setHtmlCanvasSize();
        this._interactionOverlay = new InteractionOverlay(this._htmlSvg, this._grid);

        this._stage = new Stage(this._htmlCanvas, this._grid);

        this.subscribeToCoordinates();
        this.subscribeToRange();
        this.addResulutionsDropdownEventListener();
        this.addPlaneDropdownEventListener();
        this.addExportButtonClickListener();
        this.addRangeButtonsClickListener();
        this.addConfigurationButtonsClickListener();
        this.handlePhysicalKeyboardEvents();
        this.switchPlane(initialPlane);
    }

    private switchPlane(planeId: PlaneId) {
        this._plane?.onDestroy();
        this._config.data.currentPlaneId = planeId;
        switch (planeId) {
            case 'NOISE': {
                this._plane = new Noise(this._grid);
                break;
            }
            case 'CHARGES': {
                this._plane = new Charges(this._grid);
                break;
            }
            case 'WEATHER': {
                this._plane = new Weather(this._grid);
                break;
            }
            case 'MANDELBROT_ITERATIONS': {
                this._plane = new MandelbrotIterations(this._grid);
                break;
            }
            case 'MANDELBROT_DISTANCE': {
                this._plane = new MandelbrotDistance(this._grid);
                break;
            }
            case 'MANDELBROT_VECTOR': {
                this._plane = new MandelbrotVector(this._grid);
                break;
            }
            case 'MANDELBROT_COMBINED_ID': {
                this._plane = new MandelbrotCombinedID(this._grid);
                break;
            }
            case 'MANDELBROT_COMBINED_IV': {
                this._plane = new MandelbrotCombinedIV(this._grid);
                break;
            }
            case 'GRADIENT': {
                this._plane = new Gradient(this._grid);
                break;
            }
            case 'COLOR_BLEND': {
                this._plane = new ColorBlending(this._grid);
                break;
            }
        }
        this.subscribeToBusyState();
        this.subscribeToSelection();
        if (this._plane != null) {
            this._stage.setPlane(this._plane);
            this._configOverlay.setConfig(this._plane.config);
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

    private initializePlaneSelect(): PlaneId {
        this._planeSelect.innerHTML = '';
        let selectedPlaneId = this._config.data.currentPlaneId;

        for (const plane of PLANE_TYPES) {
            const option = document.createElement('option');
            option.label = plane.short;
            option.value = plane.id;
            if (plane.id == selectedPlaneId) {
                option.selected = true;
            }
            this._planeSelect.appendChild(option);
        };
        return selectedPlaneId;
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
            next: (range) => { this._rangeInput.value = gridRangeToString(range); }
        });
    }

    private subscribeToSelection() {
        this._selectionSubscription?.unsubscribe();
        this._selectionSubscription = this._interactionOverlay.selectedRange$.subscribe({
            next: (selection) => { this._plane?.updateGridRange(selection); }
        });
    }

    private subscribeToBusyState() {
        this._busySubscription?.unsubscribe();
        if (this._plane != null) {
            this._busySubscription = this._plane.busy$.subscribe({
                next: (progress) => {
                    const busyIndicator = document.getElementById('busyIndicator') as HTMLDivElement;
                    const progressBar = document.getElementById('progressBar') as HTMLDivElement;
                    const progressIndicator = document.getElementById('progressIndicator') as HTMLDivElement;
                    const progressStep = document.getElementById('progressStep') as HTMLDivElement;
                    const resolutionSelect = document.getElementById('resolutionSelect') as HTMLSelectElement;
                    const exportButton = document.getElementById('exportButton') as HTMLDivElement;
                    const setConfigButton = document.getElementById('setConfigButton') as HTMLDivElement;
                    const copyConfigButton = document.getElementById('copyConfigButton') as HTMLDivElement;
                    const resetConfigButton = document.getElementById('resetConfigButton') as HTMLDivElement;
                    if (progress !== null) {
                        busyIndicator.className = 'busyIndicator--busy';
                        progressBar.classList.remove('gone');
                        progressIndicator.style.width = `${progress.percentage * 3.92}px`;
                        progressStep.textContent = progress.step;
                        resolutionSelect.classList.add('gone');
                        exportButton.classList.add('gone');
                        setConfigButton.classList.add('gone');
                        copyConfigButton.classList.add('gone');
                        resetConfigButton.classList.add('gone');
                        if (this._planeSelect != null) this._planeSelect.disabled = true;
                        this._htmlSvg.classList.add('gone');
                        this._rangeArea?.classList.add('invisible');
                    } else {
                        busyIndicator.className = 'busyIndicator--idle';
                        progressBar.classList.add('gone');
                        progressIndicator.style.width = '0px';
                        progressStep.textContent = '';
                        resolutionSelect.classList.remove('gone');
                        exportButton.classList.remove('gone');
                        setConfigButton.classList.remove('gone');
                        copyConfigButton.classList.remove('gone');
                        resetConfigButton.classList.remove('gone');
                        if (this._planeSelect != null) this._planeSelect.disabled = false;
                        this._htmlSvg.classList.remove('gone');
                        this._rangeArea?.classList.remove('invisible');
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
            if (VALID_PLANE_IDS.includes(selectedValue as PlaneId)) {
                this.switchPlane(selectedValue as PlaneId);
            } else {
                console.warn(`Invalid plane ID: ${selectedValue}`);
            }
        });
    }

    private addExportButtonClickListener() {
        this._exportButton?.addEventListener('click', () => { this.exportImage(); });
    }

    private exportImage() {
        const rangeString = gridRangeToString(this._grid.range);
        let filename = prompt('Enter a filename', `YottaPXL_${rangeString}${idGenerator.newId('')}`);
        if (!filename) return;

        // Export the image
        const dataURL = this._htmlCanvas.toDataURL('image/png');
        const imgLink = document.createElement('a');
        imgLink.download = `${filename}.png`;
        imgLink.href = dataURL;
        imgLink.click();

        // Export the metadata
        const metaLink = document.createElement('a');
        const planeConfig = this._plane?.config;
        if (planeConfig != null) {
            const metaData = planeConfig.export();
            metaData.info.push(`Resolution: ${resolutionAsString(this._grid.resolution)} - ${this._grid.resolution.description}`);
            const metaDataJson = JSON.stringify(metaData, null, 2);
            const blob = new Blob([metaDataJson], { type: 'application/json' });
            metaLink.download = `${filename}.json`;
            metaLink.href = URL.createObjectURL(blob);
            metaLink.click();
        }

        // Clean up
        timer(100).subscribe(() => {
            imgLink.remove();
            metaLink.remove();
            URL.revokeObjectURL(metaLink.href);
        });
    }

    private addRangeButtonsClickListener() {
        const setRangeButton = document.getElementById('setRangeButton') as HTMLDivElement;
        const copyRangeButton = document.getElementById('copyRangeButton') as HTMLDivElement;
        const resetRangeButton = document.getElementById('resetRangeButton') as HTMLDivElement;

        setRangeButton?.addEventListener('click', (e: PointerEvent) => {
            const rangeInputText: string = this._rangeInput.value;
            const newRange = gridRangeFromString(rangeInputText);
            if (newRange !== null) {
                this._interactionOverlay.selectRange(newRange);
            }
        });
        copyRangeButton?.addEventListener('click', (e: PointerEvent) => {
            this.triggerButtonFeedback(copyRangeButton);
            const rangeInputText: string = this._rangeInput.value;
            this.copyToClipboard(rangeInputText);
        });
        resetRangeButton?.addEventListener('click', (e: PointerEvent) => {
            if (this._plane != null) {
                this._plane.resetGridRange();
            } else {
                console.error('#addSetRangeButtonClickListener - unexpected _plane is null');
            }
        });
    }

    private addConfigurationButtonsClickListener() {
        this._configOverlay = new ConfigOverlay('overlayContainer', ['Escape', 'o']);
        document.getElementById('setConfigButton')?.addEventListener('click', () => {
            this._configOverlay.openOverlay();
        });

        const copyConfigButton = document.getElementById('copyConfigButton') as HTMLDivElement;
        const resetConfigButton = document.getElementById('resetConfigButton') as HTMLDivElement;

        copyConfigButton?.addEventListener('click', (e: PointerEvent) => {
            const planeConfig = this._plane?.config;
            if (planeConfig != null) {
                this.triggerButtonFeedback(copyConfigButton);
                const metaData = planeConfig.export();
                const metaDataJson = JSON.stringify(metaData, null, 2);
                this.copyToClipboard(metaDataJson);
            }
        });
        resetConfigButton?.addEventListener('click', (e: PointerEvent) => {
            if (this._plane != null) {
                this._plane.resetConfiguration();
            } else {
                console.error('#subscribeToBusyState - unexpected _plane is null');
            }
        });
    }

    private triggerButtonFeedback(button: HTMLDivElement) {
        button.classList.add('feedback');
        button?.addEventListener('animationend', () => {
            button.classList.remove('feedback');
        }, { once: true });
    }

    private async copyToClipboard(text: string): Promise<boolean> {
        if (navigator.clipboard) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (err) {
                console.warn('#copyToClipboard - Modern clipboard API failed:', err);
            }
        }

        // Fallback for mobile/older browsers
        return new Promise((resolve) => {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();

            try {
                const success = document.execCommand('copy');
                resolve(success);
            } catch (err) {
                console.error('#copyToClipboard - Fallback copy failed:', err);
                resolve(false);
            } finally {
                document.body.removeChild(textarea);
            }
        });
    }

    private handlePhysicalKeyboardEvents() {
        document.addEventListener(
            "keydown",
            (event) => {
                if (this._configOverlay.isOpen) return;
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
            case 'e': { this.exportImage(); } break;
            case 'o': { this._configOverlay.openOverlay(); } break;
            case 'ArrowUp': { this._interactionOverlay.shiftRange(ShiftDirection.UP); } break;
            case 'ArrowDown': { this._interactionOverlay.shiftRange(ShiftDirection.DOWN); } break;
            case 'ArrowLeft': { this._interactionOverlay.shiftRange(ShiftDirection.LEFT); } break;
            case 'ArrowRight': { this._interactionOverlay.shiftRange(ShiftDirection.RIGHT); } break;
        }
    }
}