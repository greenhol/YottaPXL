export interface Initializable {
    init(): void;
}

type Constructor<T = {}> = new (...args: any[]) => T;

export function InitializeAfterConstruct<T extends Constructor<Initializable>>() {
    return function (constructor: T) {
        return class extends constructor {
            constructor(...args: any[]) {
                super(...args);
                this.init();
            }
        };
    };
}