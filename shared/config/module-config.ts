export class ModuleConfig<T> {
    data: T;
    private _initialConfig: T;
    private _storageKey: string;
    private _persistable: boolean;
    private _storageType: 'local' | 'session';

    constructor(
        initialConfig: T,
        storageKey: string = '',
        storageType: 'local' | 'session' = 'local',
    ) {
        this._initialConfig = initialConfig;
        this._storageKey = storageKey;
        this._persistable = !!storageKey;
        this._storageType = storageType;
        
        if (!this.load()) {
            this.data = { ...this._initialConfig };
        }
        this.init();
    }

    private init() {
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

    save(): void {
        if (!this._persistable) {
            console.log(`Configuration ${this._storageKey} not persistable`);
        } else {
            const storageObject = this._storageType === 'local' ? localStorage : sessionStorage;
            storageObject.setItem(this._storageKey, JSON.stringify(this.data));
            console.log(`Configuration ${this._storageKey} saved to ${this._storageType}`);
        }
    }

    load(): boolean {
        if (!this._persistable) {
            return false;
        } else {
            const storageObject = this._storageType === 'local' ? localStorage : sessionStorage;
            const data = storageObject.getItem(this._storageKey);
            if (data) {
                try {
                    this.data = JSON.parse(data);
                    console.log(`Configuration ${this._storageKey} loaded from ${this._storageType}`);
                    return true;
                } catch (e) {
                    console.error('Error loading configuration ${this._storageKey}:', e);
                    return false;
                }
            } else {
                console.log(`No Configuration ${this._storageKey} found in ${this._storageType}`);
                return false;
            }
        }
    }

    clear(): void {
        const storageObject = this._storageType === 'local' ? localStorage : sessionStorage;
        storageObject.removeItem(this._storageKey);
        console.log(`Configuration ${this._storageKey} cleared from ${this._storageType}`);
    }

    print(): void {
        console.log('Current configuration ${this._storageKey}:', this.data);
    }

    reset(): void {
        this.data = { ...this._initialConfig };
        console.log(`Configuration ${this._storageKey} reset ${JSON.stringify(this.data)}`);
    }
}
