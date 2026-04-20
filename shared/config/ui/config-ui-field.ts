import { BehaviorSubject } from 'rxjs';
import { idGenerator } from '../../unique';

export type UiFieldType = 'header' | 'string' | 'integer' | 'float' | 'boolean' | 'color' | 'enum';

export abstract class ConfigUiField<T> {

    private _id: string;
    private _path: string;
    private _type: UiFieldType;
    private _label: string;
    private _description: string;
    private _value$ = new BehaviorSubject<T | null>(null);

    constructor(
        path: string,
        type: UiFieldType,
        label: string,
        description: string,
    ) {
        this._id = idGenerator.newId(type);
        this._path = path;
        this._type = type;
        this._label = (label != null) ? label : path;
        this._description = description;
    }

    public get id(): string {
        return this._id;
    }

    public get path(): string {
        return this._path;
    }

    public get type(): UiFieldType {
        return this._type;
    }

    public set value(v: string) {
        this._value$.next(this.validate(v));
    }

    public get value$(): BehaviorSubject<T | null> {
        return this._value$;
    }

    public get label(): string {
        return this._label;
    }

    public get description(): string {
        return this._description;
    }

    public loadFromData(data: any) {
        if (this._path.length == 0) return;
        const { parent, key } = this.traverseToParent(data, this._path);
        if (parent[key] === undefined) {
            throw new Error(`Property ${key} does not exist in the object.`);
        }
        this.value = parent[key].toString();
    }

    public saveToData(data: any) {
        if (this._path.length == 0) return;
        const { parent, key } = this.traverseToParent(data, this._path);
        if (parent[key] === undefined) {
            throw new Error(`Property ${key} does not exist in the object.`);
        }
        parent[key] = this._value$.value;
    }

    abstract fullDescription: string;

    abstract validate(v: string): T;

    private traverseToParent(data: any, path: string) {
        const parts = path.split('.');
        let current = data;

        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (current[part] === undefined) {
                throw new Error(`Path ${path} does not exist in the object.`);
            }
            current = current[part];
        }

        const lastPart = parts[parts.length - 1];
        return { parent: current, key: lastPart };
    }
}

export class UiFieldHeader extends ConfigUiField<void> {

    constructor(label: string, description: string = '') {
        super('', 'header', label, description);
    }

    override get fullDescription() {
        return this.description;
    }

    override validate(v: string): void {
        // Nothing to validate
    }
}

export class UiFieldString extends ConfigUiField<string> {

    constructor(
        path: string,
        label: string,
        description: string,
    ) {
        super(path, 'string', label, description);
    }

    override get fullDescription() {
        return this.description;
    }

    override validate(v: string): string {
        return v;
    }
}

export class UiFieldInteger extends ConfigUiField<number> {

    private _min: number;
    private _max: number;

    constructor(
        path: string,
        label: string,
        description: string,
        min: number = Number.MIN_SAFE_INTEGER,
        max: number = Number.MAX_SAFE_INTEGER,
    ) {
        super(path, 'integer', label, description);
        this._min = min;
        this._max = max;
        if (this._max <= this._min) throw Error(`min and max values invalid: min=${min}, max=${max}`);
    }

    override get fullDescription() {
        return `Int ${this._min}..${this._max}: ${this.description}`;
    }

    override validate(v: string): number {
        const asInteger = parseInt(v);
        return Math.min(Math.max(asInteger, this._min), this._max);
    }
}

export class UiFieldFloat extends ConfigUiField<number> {

    private _min: number;
    private _max: number;

    constructor(
        path: string,
        label: string,
        description: string,
        min: number = Number.MIN_VALUE,
        max: number = Number.MAX_VALUE,
    ) {
        super(path, 'float', label, description);
        this._min = min;
        this._max = max;
        if (this._max <= this._min) throw Error(`min and max values invalid: min=${min}, max=${max}`);
    }

    override get fullDescription() {
        return `Float ${this._min}..${this._max}: ${this.description}`;
    }

    override validate(v: string): number {
        return Math.min(Math.max(parseFloat(v), this._min), this._max);
    }
}

export class UiFieldBool extends ConfigUiField<boolean> {

    constructor(
        path: string,
        label: string,
        description: string,
    ) {
        super(path, 'boolean', label, description);
    }

    override get fullDescription() {
        return this.description;
    }

    override validate(v: string): boolean {
        return v === 'true';
    }
}

export class UiFieldColor extends ConfigUiField<string> {

    constructor(
        path: string,
        label: string,
        description: string,
    ) {
        super(path, 'color', label, description);
    }

    override get fullDescription() {
        return this.description;
    }

    override validate(v: string): string {
        return v;
    }
}


export class UiFieldStringEnum<U extends Record<string, unknown>> extends ConfigUiField<U[keyof U]> {

    private _enumObj: U;
    private _enumValues: Array<U[keyof U]>;

    private static getEnumValues<T extends Record<string, unknown>>(enumObj: T): Array<T[keyof T]> {
        return Object.values(enumObj) as Array<T[keyof T]>;
    }

    constructor(
        path: string,
        enumObj: U,
        label: string,
        description: string,
    ) {
        super(path, 'enum', label, description);
        this._enumObj = enumObj;
        this._enumValues = UiFieldStringEnum.getEnumValues(enumObj);
    }

    public get enumObj() {
        return this._enumObj;
    }

    override get fullDescription() {
        return this.description;
    }

    override validate(v: string): U[keyof U] {
        if (this._enumValues.includes(v as U[keyof U])) {
            return v as U[keyof U];
        } else {
            console.warn(`Invalid enum value: ${v}. Defaulting to the first enum value.`);
            return this._enumValues[0];
        }
    }
}
