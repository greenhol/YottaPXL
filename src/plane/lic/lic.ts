import { Grid, GridRange } from '../../grid/grid';
import { GridWithBuffer } from '../../grid/grid-with-buffer';
import { RectangleCoordinates } from '../../stage/interactionOverlay';
import { Plane } from '../plane';
import { ChargeField } from './field/charge-field';

interface PointInPixel {
    iDiff: number;
    jDiff: number;
    x: number;
    y: number;
    distance: number;
}

export class Lic extends Plane {

    private _sourceGrid: GridWithBuffer;
    private _field: ChargeField;
    private _sourceData: Float64Array;
    private _licData: Float64Array;
    private _buffer = 50;

    constructor(grid: Grid) {
        const range: GridRange = { xMin: -1, xMax: 1, yCenter: 0 };
        grid.updateRange(range);
        super(grid);

        this._sourceGrid = new GridWithBuffer(grid.resolution, range, this._buffer);
        this._field = new ChargeField(this._sourceGrid);
        this.create();
    }

    override name: string = 'LIC';

    override updateArea(selection: RectangleCoordinates) {
        console.log('LIC #updateArea - not implemented yet');
        // ToDo
    }

    override setMaxIterations(value: number) {
        // Does not apply
    }

    private create() {
        this.setBusy();

        // ToDo: remove setTimeouts when web workers are 
        setTimeout(() => {
            this.createSourceData();
            this.updateImage(this.createSourceImage());

            setTimeout(() => {
                this.calculateLIC();
                this.updateImage(this.createLicImage());

                setTimeout(() => {
                    this.setIdle();
                }, 50);
            }, 50);
        }, 50);
    }

    private createSourceData() {
        this._sourceData = new Float64Array(this._sourceGrid.size);
        for (let y = 0; y < this._sourceGrid.height; y++) {
            for (let x = 0; x < this._sourceGrid.width; x++) {
                this._sourceData[this._sourceGrid.getIndex(x, y)] = this.biasedRandom(4) * 255;
            }
        }
    }

    private biasedRandom(bias: number = 0.5): number {
        const r = Math.random(); // 0 to 1
        return r ** (1 / bias); // Shift closer to 1 as bias increases
    }

    private calculateLIC() {
        this._licData = new Float64Array(this.grid.size);
        this.calcLicByLength(10);
    }

    private createSourceImage(): ImageDataArray {
        const imageData = new Uint8ClampedArray(this.grid.size * 4);
        for (let y = 0; y < this.grid.height; y++) {
            for (let x = 0; x < this.grid.width; x++) {
                const destinationIndex = this._sourceGrid.getIndexForCenterArea(x, y);
                let value = this._sourceData[destinationIndex];
                const index = this.grid.getIndex(x, y);
                const pixelIndex = index * 4;
                imageData[pixelIndex] = value;     // R
                imageData[pixelIndex + 1] = value; // G
                imageData[pixelIndex + 2] = value; // B
                imageData[pixelIndex + 3] = 255; // A (opaque)
            }
        }
        return imageData;
    }

    private createLicImage(): ImageDataArray {
        const imageData = new Uint8ClampedArray(this.grid.size * 4);
        for (let y = 0; y < this.grid.height; y++) {
            for (let x = 0; x < this.grid.width; x++) {
                const index = this.grid.getIndex(x, y);
                let value = this._licData[index];
                const pixelIndex = index * 4;
                imageData[pixelIndex] = value;     // R
                imageData[pixelIndex + 1] = value; // G
                imageData[pixelIndex + 2] = value; // B
                imageData[pixelIndex + 3] = 255; // A (opaque)
            }
        }
        return imageData;
    }

    private calcLicByLength(l: number) {
        l = l / Math.SQRT2;
        let rowCnt = 0;
        let timeStamp = Date.now();
        console.info('calculation started (type: LENGTH, l: ' + (2 * l) + ')');

        for (let i = 0; i < this.grid.height; i++) {
            for (let j = 0; j < this.grid.width; j++) {
                this._licData[this.grid.getIndex(j, i)] = this.calcLicPixel(i, j, l);
            }
            if (rowCnt > 49) {
                console.info('calculating: ' + Math.round(100 * i / this.grid.height) + '%');
                rowCnt = 0;
            }
            rowCnt++;
        }
        console.info('calculation done in ' + (Date.now() - timeStamp) / 1000 + 's');
    }

    private calcLicPixel(i: number, j: number, l: number): number {
        let brightness = this.calcLicPixelInDirection(i, j, l);
        brightness += this.calcLicPixelInDirection(i, j, l, -1);

        brightness = Math.round(brightness / (2 * l));
        if (brightness > 255) brightness = 255;
        return brightness;
    }

    private calcLicPixelInDirection(i: number, j: number, l: number, direction: number = 1): number {
        let restDistance = l;
        let [vX, vY] = this._field.getVector(j + this._buffer, i + this._buffer);
        vX *= direction;
        vY *= direction;
        let nextArea = this.getNextArea(0.5, 0.5, vX, vY);
        let factor = (nextArea.distance < restDistance) ? nextArea.distance : restDistance;
        let brightness = this._sourceData[this._sourceGrid.getIndexForCenterArea(j, i)] * factor;
        restDistance = l - nextArea.distance;
        while (restDistance > 0) {
            i += nextArea.iDiff;
            j += nextArea.jDiff;
            [vX, vY] = this._field.getVector(j + this._buffer, i + this._buffer);
            vX *= direction;
            vY *= direction;
            nextArea = this.getNextArea(nextArea.x, nextArea.y, vX, vY);
            factor = (nextArea.distance < restDistance) ? nextArea.distance : restDistance;
            brightness += (this._sourceData[this._sourceGrid.getIndexForCenterArea(j, i)] * factor);
            restDistance -= nextArea.distance;
        }
        return brightness;
    }

    private getNextArea(x: number, y: number, vX: number, vY: number): PointInPixel {
        let alphas: number[] = []
        let beta: number;
        const offset = 0.01;
        // Top, Bottom, Left, Right
        alphas.push((1 - y) / vY);
        alphas.push(-y / vY);
        alphas.push(-x / vX);
        alphas.push((1 - x) / vX);
        alphas.forEach((alpha: number, i: number) => {
            if (alpha <= 0) alphas[i] = Infinity;
        })
        const borderIndex = alphas.indexOf(Math.min(...alphas));
        const distance = Math.sqrt(Math.pow(alphas[borderIndex] * vX, 2) + Math.pow(alphas[borderIndex] * vY, 2)) / Math.SQRT2;

        switch (borderIndex) {
            case 0: // Top
                beta = vX * alphas[borderIndex] + x;
                return {
                    iDiff: -1,
                    jDiff: 0,
                    x: beta,
                    y: offset,
                    distance: distance
                }
            case 1: // Bottom
                beta = vX * alphas[borderIndex] + x;
                return {
                    iDiff: 1,
                    jDiff: 0,
                    x: beta,
                    y: 1 - offset,
                    distance: distance
                }
            case 2: // Left
                beta = vY * alphas[borderIndex] + y;
                return {
                    iDiff: 0,
                    jDiff: -1,
                    x: 1 - offset,
                    y: beta,
                    distance: distance
                }
            case 3: // Right
                beta = vY * alphas[borderIndex] + y;
                return {
                    iDiff: 0,
                    jDiff: 1,
                    x: offset,
                    y: beta,
                    distance: distance
                }
            default:
                return {
                    iDiff: 0,
                    jDiff: 0,
                    x: 0.5,
                    y: 0.5,
                    distance: distance
                }
        }
    }
}