import { UiFieldBool, UiFieldColor, UiFieldFloat, UiFieldHeader, UiFieldInteger, UiFieldString, UiFieldStringEnum } from './config-ui-field';

export abstract class ConfigUiFieldCreator {

    public createHeader(
        label: string,
        description: string = '',
    ): UiFieldHeader {
        return new UiFieldHeader(label, description);
    }

    public createStringField(
        path: string,
        label: string,
        description: string = '',
    ): UiFieldString {
        return new UiFieldString(path, label, description);
    }

    public createIntegerField(
        path: string,
        label: string,
        description: string = '',
        min: number = Number.MIN_SAFE_INTEGER,
        max: number = Number.MAX_SAFE_INTEGER,
    ): UiFieldInteger {
        return new UiFieldInteger(path, label, description, min, max);
    }

    public createFloatField(
        path: string,
        label: string,
        description: string = '',
        min: number = Number.MIN_SAFE_INTEGER,
        max: number = Number.MAX_SAFE_INTEGER,
    ): UiFieldFloat {
        return new UiFieldFloat(path, label, description, min, max);
    }

    public createBoolField(
        path: string,
        label: string,
        description: string = '',
    ): UiFieldBool {
        return new UiFieldBool(path, label, description);
    }

    public createColorField(
        path: string,
        label: string,
        description: string = '',
    ): UiFieldColor {
        return new UiFieldColor(path, label, description);
    }

    public createEnumField<T extends Record<string, unknown>>(
        path: string,
        enumObj: T,
        label: string,
        description: string = '',
    ): UiFieldStringEnum<T> {
        return new UiFieldStringEnum<T>(path, enumObj, label, description);
    }
}
