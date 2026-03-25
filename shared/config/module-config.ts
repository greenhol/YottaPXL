import { ConfigUiField } from './ui/config-ui-field';

declare const APP_NAME: string;

export class ModuleConfig<T> {
    public data: T;
    private _initialConfig: T;
    private _storageKey: string;
    private _persistable: boolean;
    private _storageType: 'local' | 'session';
    private _configUiSchema: ConfigUiField<any>[];

    constructor(
        initialConfig: T,
        storageKey: string = '',
        configUiSchema: ConfigUiField<any>[] = [],
        storageType: 'local' | 'session' = 'local',
    ) {
        this._initialConfig = initialConfig;
        this._storageKey = APP_NAME + '_' + storageKey;
        this._persistable = !!storageKey;
        this._configUiSchema = configUiSchema;
        this._storageType = storageType;

        if (!this.load()) {
            this.updateData({ ...this._initialConfig });
        }
        this.appendToWindow();
    }

    public get configUiSchema() {
        return this._configUiSchema;
    }

    public save(): void {
        if (!this._persistable) {
            console.log(`#save - Configuration ${this._storageKey} not persistable`);
        } else {
            const storageObject = this._storageType === 'local' ? localStorage : sessionStorage;
            storageObject.setItem(this._storageKey, JSON.stringify(this.data));
            console.log(`Configuration ${this._storageKey} saved to ${this._storageType}`);
        }
    }

    public load(): boolean {
        if (!this._persistable) {
            return false;
        } else {
            const storageObject = this._storageType === 'local' ? localStorage : sessionStorage;
            const data = storageObject.getItem(this._storageKey);
            if (data) {
                try {
                    this.updateData(JSON.parse(data));
                    console.log(`#load - Configuration ${this._storageKey} loaded from ${this._storageType}`);
                    return true;
                } catch (e) {
                    console.error('#load - Error loading configuration ${this._storageKey}:', e);
                    return false;
                }
            } else {
                console.log(`#load - No Configuration ${this._storageKey} found in ${this._storageType}`);
                return false;
            }
        }
    }

    public clear(): void {
        const storageObject = this._storageType === 'local' ? localStorage : sessionStorage;
        storageObject.removeItem(this._storageKey);
        console.log(`#clear - Configuration ${this._storageKey} cleared from ${this._storageType}`);
    }

    public print(): void {
        console.log('#print - Current configuration ${this._storageKey}:', this.data);
    }

    public reset(): void {
        this.updateData({ ...this._initialConfig });
        console.log(`#reset - Configuration ${this._storageKey} reset ${JSON.stringify(this.data)}`);
    }

    private appendToWindow() {
        // @ts-ignore
        if (window.appConfig == null) {
            // @ts-ignore
            window.appConfig = [];
        }
        // @ts-ignore
        if (window.appConfigCtrl == null) {
            // @ts-ignore
            window.appConfigCtrl = [];
        }

        // @ts-ignore
        window.appConfig[this._storageKey] = this.data;
        // @ts-ignore
        window.appConfigCtrl[this._storageKey] = this;

        window.addEventListener('beforeunload', () => {
            this.save();
        });
    }

    private updateData(data: T) {
        this.data = data;
        this._configUiSchema.forEach((field) => field.loadFromData(this.data));
    }
}
