import { RESOLUTIONS, resolutionAsArray } from '../grid/resolutions';

export class UrlHandler {

    private readonly _widthParameter: string = 'width';
    private readonly _heightParameter: string = 'height';

    getResolution(): [number, number] {
        const fallBackResolution = RESOLUTIONS[17];
        if (!window.location.hash) return resolutionAsArray(fallBackResolution);
        const hash = window.location.hash.substring(1);
        const parameters = new URLSearchParams(hash);
        const width = this.parseIntOrNull(parameters.get(this._widthParameter));
        const height = this.parseIntOrNull(parameters.get(this._heightParameter));
        if (width !== null && height !== null) {
            return [width, height];
        } else {
            return resolutionAsArray(fallBackResolution);
        }
    }

    updateResolution(width: number, height: number) {
        const newHash = `${this._widthParameter}=${encodeURIComponent(width)}&${this._heightParameter}=${encodeURIComponent(height)}`;
        window.history.replaceState(null, "", `#${newHash}`);
    }

    private parseIntOrNull(value: string | null): number | null {
        if (!value) return null;
        const num = Number(value);
        return isNaN(num) ? null : num;
    }
}