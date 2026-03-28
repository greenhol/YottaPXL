import { Subject, takeUntil } from 'rxjs';
import { ModuleConfig } from '../module-config';
import { UiFieldBool, UiFieldFloat, UiFieldInteger, UiFieldStringEnum } from './config-ui-field';

export class ConfigOverlay {

    private _config: ModuleConfig<any>;

    private _overlay: HTMLDivElement | null;
    private _overlayGoneClass: string = 'config-overlay--gone';

    private _isOpen: boolean = false;

    private _closeKeys: string[];
    private _boundKeyboardHandler: (event: KeyboardEvent) => void;

    private _initialized$: Promise<void>;
    private _abortFieldSubscriptions$ = new Subject<void>();

    constructor(containerId: string, closeKeys: string[] = []) {
        this._closeKeys = closeKeys;
        this._initialized$ = this.appendConfigurationOverlay(containerId);
    }

    public async setConfig(config: ModuleConfig<any>) {
        await this._initialized$;
        this._abortFieldSubscriptions$.next();
        this._config = config;
        this.appendFields();
    }

    public get isOpen() {
        return this._isOpen;
    }

    public get isClosed() {
        return !this._isOpen;
    }

    public openOverlay() {
        this.addKeyboardEvents();
        this.subsribeToFields();
        this._isOpen = true;
        this._overlay?.classList.remove(this._overlayGoneClass);
    }

    private closeOverlay() {
        this.removeKeyboardEvents();
        this._abortFieldSubscriptions$.next();
        this._isOpen = false;
        this._overlay?.classList.add(this._overlayGoneClass);
    }

    private async appendConfigurationOverlay(containerId: string): Promise<void> {
        await new Promise<void>((resolve) => {
            fetch('config-overlay.html')
                .then(response => response.text())
                .then(html => {
                    const containerDiv = document.getElementById(containerId);
                    if (containerDiv != null) {
                        containerDiv.innerHTML = html;
                    } else {
                        console.error(`#appendConfigurationOverlay - container ${containerId} not found`);
                    }
                })
                .then(_ => {
                    this._overlay = document.getElementById('config-overlay') as HTMLDivElement;
                    this._overlay.addEventListener('click', () => {
                        this.closeOverlay();
                    });
                    document.getElementById('config-overlay-content')?.addEventListener('click', (e) => {
                        e.stopPropagation();
                    });
                    document.getElementById('config-overlay-close-button')?.addEventListener('click', () => {
                        this.closeOverlay();
                    });
                    resolve();
                });
        });
    }

    private appendFields() {
        const dynamicContainer = document.getElementById('config-overlay-dynamic-content');
        if (!dynamicContainer) throw Error('container for config not found!');

        dynamicContainer.innerHTML = '';
        if (this._config.configUiSchema.length == 0) {
            dynamicContainer.innerHTML = '&nbsp;Nothing declared for configuration';
            return;
        }

        const gridContainer = document.createElement('div');
        gridContainer.id = 'config-overlay-grid-content';
        gridContainer.className = 'config-overlay-grid';
        dynamicContainer.append(gridContainer);

        this._config.configUiSchema.forEach((field) => {
            const row: HTMLDivElement = document.createElement('div');
            row.className = 'config-overlay-item';

            // Column 1: Label
            const label = document.createElement('label');
            label.className = 'config-overlay-labels';
            label.textContent = field.label;
            label.title = field.fullDescription;
            label.htmlFor = field.id;
            row.appendChild(label);

            // Column 2: Input
            switch (field.type) {
                case 'integer':
                    row.appendChild(this.appendIntegerField(field as UiFieldInteger));
                    break;
                case 'float':
                    row.appendChild(this.appendFloatField(field as UiFieldFloat));
                    break;
                case 'boolean':
                    row.appendChild(this.appendBoolField(field as UiFieldBool));
                    break;
                case 'enum':
                    row.appendChild(this.appendEnumField(field as UiFieldStringEnum<any>));
                    break;
            }

            gridContainer.appendChild(row);
        });

        const appendButton = document.createElement('div');
        appendButton.id = 'config-overlay-apply-button';
        appendButton.className = 'config-overlay-button';
        appendButton.textContent = 'Apply';
        appendButton.addEventListener('click', () => {
            this.updateConfiguration();
            location.reload();
        });
        dynamicContainer.append(appendButton);
    }

    private appendIntegerField(field: UiFieldInteger): HTMLInputElement {
        const input = document.createElement('input');
        input.type = 'number';
        input.id = field.id;
        input.step = '1';
        input.addEventListener('change', (event) => {
            field.value = (event.target as HTMLInputElement).value;
        });
        return input;
    }

    private appendFloatField(field: UiFieldFloat): HTMLInputElement {
        const input = document.createElement('input');
        input.type = 'number';
        input.id = field.id;
        input.step = 'any';
        input.addEventListener('change', (event) => {
            field.value = (event.target as HTMLInputElement).value;
        });
        return input;
    }

    private appendBoolField(field: UiFieldBool): HTMLInputElement {
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = field.id;
        input.addEventListener('change', (event) => {
            field.value = (event.target as HTMLInputElement).checked.toString();
        });
        return input;
    }

    private appendEnumField(field: UiFieldStringEnum<any>): HTMLSelectElement {
        const input = document.createElement('select');
        input.id = field.id;
        Object.keys(field.enumObj!).filter((key) => isNaN(Number(key))).forEach((key) => {
            const option = document.createElement('option');
            option.value = field.enumObj![key];
            option.textContent = field.enumObj![key];
            input.appendChild(option);
        });
        input.value = field.value as string;
        input.addEventListener('change', () => {
            field.value = input.value;
        });
        return input;
    }

    private keyboardHandler(event: KeyboardEvent, keys: string[]) {
        if (keys.includes(event.key)) this.closeOverlay();
    }

    private addKeyboardEvents() {
        this._boundKeyboardHandler = (event: KeyboardEvent) => {
            this.keyboardHandler(event, this._closeKeys);
        };
        document.addEventListener('keydown', this._boundKeyboardHandler);
    }

    private removeKeyboardEvents() {
        document.removeEventListener('keydown', this._boundKeyboardHandler);
    }

    private subsribeToFields() {
        this._config.configUiSchema.forEach((field) => {
            switch (field.type) {
                case 'integer':
                case 'float':
                    field.value$.pipe(takeUntil(this._abortFieldSubscriptions$)).subscribe((v) => {
                        // console.log(`#subsribeToFields: number value ${v}`);
                        const uiField = document.getElementById(field.id) as HTMLInputElement;
                        uiField.value = v;
                    });
                    break;
                case 'boolean':
                    field.value$.pipe(takeUntil(this._abortFieldSubscriptions$)).subscribe((v) => {
                        // console.log(`#subsribeToFields: bool value ${v}`);
                        const uiField = document.getElementById(field.id) as HTMLInputElement;
                        uiField.checked = v;
                    });
                    break;
                case 'enum':
                    field.value$.pipe(takeUntil(this._abortFieldSubscriptions$)).subscribe((v) => {
                        // console.log(`#subsribeToFields: enum value ${v}`);
                        const uiField = document.getElementById(field.id) as HTMLSelectElement;
                        uiField.value = v;
                    });
                    break;
            }
        });
    }

    private updateConfiguration() {
        this._config.configUiSchema.forEach((field) => {
            field.saveToData(this._config.data);
            this._config.save();
        });
    }
}