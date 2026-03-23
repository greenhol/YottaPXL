export class ConfigOverlay {

    private _overlayId: string = 'config-overlay';
    private _overlay: HTMLDivElement | null;
    private _overlayGoneId: string = 'config-overlay--gone';
    private _closeButtonId: string = 'config-overlay-close-button';
    private _applyButtonId: string = 'config-overlay-apply-button';

    private _isOpen: boolean = false;

    constructor(containerId: string, openButtonId: string) {
        this.appendConfigurationOverlay(containerId);
        this.addOpenButtonEvent(openButtonId);
    }

    public get isOpen() {
        return this._isOpen;
    }

    public get isClosed() {
        return !this._isOpen;
    }

    private appendConfigurationOverlay(containerId: string) {
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
            });
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
        this._isOpen = false;
        this._overlay?.classList.add(this._overlayGoneId);
    }
}