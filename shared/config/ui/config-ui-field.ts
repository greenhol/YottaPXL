import { Subject } from 'rxjs';
import { Initializable, InitializeAfterConstruct } from '../../initializable';
import { idGenerator } from '../../unique';

export type UiFieldType = 'integer' | 'float' | 'boolean' | 'enum';

export abstract class ConfigUiField<T> implements Initializable {

    private _id: string;
    private _path: string;
    private _type: UiFieldType;
    private _initValue: T;
    private _label: string;
    private _description: string;
    private _value$ = new Subject<T>();

    constructor(
        path: string,
        type: UiFieldType,
        value: T,
        label: string,
        description: string,
    ) {
        this._id = idGenerator.newId(type);
        this._path = path;
        this._type = type;
        this._initValue = value;
        this._label = (label != null) ? label : path;
        this._description = description;
    }

    init(): void {
        this._value$.next(this.validate(this._initValue));
    }

    public get id() {
        return this._id;
    }

    public get path() {
        return this._path;
    }

    public get type() {
        return this._type;
    }

    public set value(v: T) {
        this._value$.next(this.validate(v));
    }

    public get label() {
        return this._label;
    }

    public get description() {
        return this._description;
    }

    abstract fullDescription: string;

    abstract validate(v: T): T
}

@InitializeAfterConstruct()
export class UiFieldInteger extends ConfigUiField<number> {

    private _min: number;
    private _max: number;

    constructor(
        path: string,
        value: number,
        label: string,
        description: string,
        min: number = Number.MIN_SAFE_INTEGER,
        max: number = Number.MAX_SAFE_INTEGER,
    ) {
        super(path, 'float', value, label, description);
        this._min = min;
        this._max = max;
        if (this._max <= this._min) throw Error(`min and max values invalid: min=${min}, max=${max}`);
    }

    override get fullDescription() {
        return `${this.description} (Integer, Range ${this._min} -> ${this._max})`;
    }

    override validate(v: number): number {
        const asInteger = Math.round(v);
        return Math.min(Math.max(asInteger, this._min), this._max);
    }
}

@InitializeAfterConstruct()
export class UiFieldFloat extends ConfigUiField<number> {

    private _min: number;
    private _max: number;

    constructor(
        path: string,
        value: number,
        label: string,
        description: string,
        min: number = Number.MIN_VALUE,
        max: number = Number.MAX_VALUE,
    ) {
        super(path, 'integer', value, label, description);
        this._min = min;
        this._max = max;
        if (this._max <= this._min) throw Error(`min and max values invalid: min=${min}, max=${max}`);
    }

    override get fullDescription() {
        return `${this.description} (Float, Range ${this._min} -> ${this._max})`;
    }

    override validate(v: number): number {
        return Math.min(Math.max(v, this._min), this._max);
    }
}

@InitializeAfterConstruct()
export class UiFieldBool extends ConfigUiField<boolean> {

    constructor(
        path: string,
        value: boolean,
        label: string,
        description: string,
    ) {
        super(path, 'boolean', value, label, description);
    }

    override get fullDescription() {
        return `${this.description} (Bool)`;
    }

    override validate(v: boolean): boolean {
        return v;
    }
}

@InitializeAfterConstruct()
export class UiFieldEnum<U extends Record<string, unknown>> extends ConfigUiField<U[keyof U]> {
    private _enumValues: Array<U[keyof U]>;

    constructor(
        path: string,
        value: U[keyof U],
        enumObj: U,
        label: string,
        description: string,
    ) {
        super(path, 'enum', value, label, description);
        this._enumValues = UiFieldEnum.getEnumValues(enumObj);
    }

    private static getEnumValues<T extends Record<string, unknown>>(enumObj: T): Array<T[keyof T]> {
        return Object.values(enumObj) as Array<T[keyof T]>;
    }

    override get fullDescription() {
        return `${this.description} (Enum)`;
    }

    override validate(v: U[keyof U]): U[keyof U] {
        if (this._enumValues.includes(v)) {
            return v;
        } else {
            console.warn(`Invalid enum value: ${v}. Defaulting to the first enum value.`);
            return this._enumValues[0];
        }
    }
}
