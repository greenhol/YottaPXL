import { Subject } from 'rxjs';
import { ModuleConfig } from '../module-config';

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
                    row.appendChild(this.appendIntegerField(field.id));
                    break;
                case 'float':
                    row.appendChild(this.appendFloatField(field.id));
                    break;
                case 'boolean':
                    row.appendChild(this.appendBoolField(field.id));
                    break;
                case 'enum':
                    row.appendChild(this.appendEnumField(field.id));
                    break;
            }

            // Column 3: Description
            const description = document.createElement('div');
            description.classList.add('config-overlay-description');
            description.classList.add('config-overlay-labels');
            description.textContent = field.fullDescription;
            row.appendChild(description);

            gridContainer.appendChild(row);
        });
    }

    private appendIntegerField(rowKey: string): HTMLInputElement {
        const input = document.createElement('input');
        input.type = 'number';
        input.id = rowKey;
        input.step = '1';
        return input;
    }

    private appendFloatField(rowKey: string): HTMLInputElement {
        const input = document.createElement('input');
        input.type = 'number';
        input.id = rowKey;
        input.step = 'any';
        return input;
    }

    private appendBoolField(rowKey: string): HTMLInputElement {
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = rowKey;
        return input;
    }

    private appendEnumField(rowKey: string): HTMLInputElement {
        const input = document.createElement('input');
        input.type = 'checkbox'; // ToDo
        input.id = rowKey;
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
        this._isOpen = true;
        this._overlay?.classList.remove(this._overlayGoneId);
    }

    private closeOverlay() {
        this._abortFieldSubscriptions$.next();
        this._isOpen = false;
        this._overlay?.classList.add(this._overlayGoneId);
    }
}