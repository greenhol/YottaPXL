import { ConfigUiField } from './ui/config-ui-field';

declare const APP_NAME: string;
declare const APP_VERSION: string;

interface ConfigExport {
    info: string[],
    data: any,
}

export class ModuleConfig<T extends object> {
    public data: T;
    private _initialConfig: T;
    private _storageKey: string;
    private _persistable: boolean;
    private _storageType: 'local' | 'session';
    private _configUiSchema: ConfigUiField<any>[];
    private _info = new Map<string, string>;

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
        this.setInfo('App', `${APP_NAME} V${APP_VERSION}`);
        this.setInfo('Storage Key', this._storageKey);

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

    public reset(path: keyof T | null = null): void {
        if (path === null) {
            this.updateData(structuredClone(this._initialConfig));
            console.log(`#reset - Configuration ${this._storageKey} reset to initial state.`);
            return;
        }

        if (!(path in this.data)) {
            throw new Error(`Path ${String(path)} does not exist in the current object.`);
        }
        if (!(path in this._initialConfig)) {
            throw new Error(`Path ${String(path)} does not exist in the initial config.`);
        }

        this.data[path] = structuredClone(this._initialConfig[path]);
        console.log(`#reset - Configuration ${this._storageKey} part:${String(path)} reset to initial value.`);
    }

    public setInfo(key: string, data: string) {
        this._info.set(key, data);
    }

    public export(): ConfigExport {
        return structuredClone({
            info: Array.from(this._info).map(([key, value]) => `${key}: ${value}`),
            data: this.data,
        });
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
