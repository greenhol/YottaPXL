import { Subject, takeUntil } from 'rxjs';
import { ModuleConfig } from '../module-config';
import { UiFieldBool, UiFieldFloat, UiFieldInteger, UiFieldStringEnum } from './config-ui-field';

export class ConfigOverlay {

    private _config: ModuleConfig<any>;

    private _overlayId: string = 'config-overlay';
    private _overlay: HTMLDivElement | null;
    private _overlayGoneId: string = 'config-overlay--gone';
    private _closeButtonId: string = 'config-overlay-close-button';
    private _applyButtonId: string = 'config-overlay-apply-button';

    private _isOpen: boolean = false;

    private _initialized$: Promise<void>;
    private _abortFieldSubscriptions$ = new Subject<void>();

    constructor(containerId: string, openButtonId: string) {
        this._initialized$ = this.appendConfigurationOverlay(containerId);
        this.addOpenButtonEvent(openButtonId);
    }

    public get isOpen() {
        return this._isOpen;
    }

    public get isClosed() {
        return !this._isOpen;
    }

    public async setConfig(config: ModuleConfig<any>) {
        await this._initialized$;
        this._abortFieldSubscriptions$.next();
        this._config = config;
        this.appendFields();
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
                    this._overlay = document.getElementById(this._overlayId) as HTMLDivElement;
                    document.getElementById(this._closeButtonId)?.addEventListener('click', () => {
                        this.closeOverlay();
                    });
                    document.getElementById(this._applyButtonId)?.addEventListener('click', () => {
                        this.updateConfiguration();
                        location.reload();
                    });
                    resolve();
                });
        });
    }

    private appendFields() {
        const gridContainer = document.getElementById('config-overlay-dynamic-content');
        if (!gridContainer) throw Error('container for config not found!');

        gridContainer.innerHTML = '';
        if (this._config.configUiSchema.length == 0) {
            gridContainer.innerHTML = 'Nothing defined for configuration';
            return;
        }

        this._config.configUiSchema.forEach((field) => {
            const row: HTMLDivElement = document.createElement('div');
            row.className = 'config-overlay-item';

            // Column 1: Label
            const label = document.createElement('label');
            label.className = 'config-overlay-labels';
            label.textContent = field.label;
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

            // Column 3: Description
            const description = document.createElement('div') as HTMLDivElement;
            description.classList.add('config-overlay-description');
            description.classList.add('config-overlay-labels');
            description.textContent = field.fullDescription;
            description.title = field.fullDescription;
            row.appendChild(description);

            gridContainer.appendChild(row);
        });
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

    private addOpenButtonEvent(openButtonId: string) {
        const buttonDiv = document.getElementById(openButtonId) as HTMLDivElement;
        if (buttonDiv != null) {
            buttonDiv?.addEventListener('click', () => {
                this.openOverlay();
            });
        } else {
            console.error(`#addOpenButtonEvent - button ${openButtonId} not found`);
        }
    }

    private openOverlay() {
        this.subsribeToFields();
        this._isOpen = true;
        this._overlay?.classList.remove(this._overlayGoneId);
    }

    private closeOverlay() {
        this._abortFieldSubscriptions$.next();
        this._isOpen = false;
        this._overlay?.classList.add(this._overlayGoneId);
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