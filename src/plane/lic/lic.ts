import { ModuleConfig } from '../../config/module-config';
import { Grid } from '../../grid/grid';
import { GridRange } from '../../grid/grid-range';
import { GridWithMargin } from '../../grid/grid-with-margin';
import { BiasType, NoiseGenerator } from '../../math/noise-generator/noise-generator';
import { ChargeField } from '../../math/vector-field/charge-field';
import { Plane, PlaneConfig } from '../plane';

const INITIAL_GRID_RANGE: GridRange = { xMin: -1, xMax: 1, yCenter: 0 };

interface PointInPixel {
    rowDiff: number;
    colDiff: number;
    x: number;
    y: number;
    distance: number;
}

export class Lic extends Plane {

    private _sourceGrid: GridWithMargin;
    private _field: ChargeField;
    private _sourceData: Float64Array;
    private _licData: Float64Array;
    private _gridMargin = 50;

    constructor(grid: Grid) {
        super(grid);
        this.calculate();
    }

    override config: ModuleConfig<PlaneConfig> = new ModuleConfig(
        { gridRange: INITIAL_GRID_RANGE },
        'licConfig',
    );

    override name: string = 'LIC';

    override updateGridRange(selectedRange: GridRange) {
        console.log('LIC #updateArea - not implemented yet');
        if (selectedRange != null) {
            this.config.data.gridRange = selectedRange;
        } else {
            this.config.reset();
        }
        this.calculate();
    }

    override setMaxIterations(value: number) {
        // Does not apply
    }

    private calculate() {
        this.setBusy();
        const range = this.config.data.gridRange;
        this.grid.updateRange(range);
        this._sourceGrid = new GridWithMargin(this.grid.resolution, range, this._gridMargin);
        this._field = new ChargeField(this._sourceGrid);

        // ToDo: remove setTimeouts when web workers are 
        setTimeout(() => {
            const generator = new NoiseGenerator(this._sourceGrid);
            this._sourceData = generator.createBiasedNoise(BiasType.UPPER);
            this.updateImage(this.createImage(this._sourceData));

            setTimeout(() => {
                this.calculateLIC();
                this.updateImage(this.createImage(this._licData));

                setTimeout(() => {
                    this.setIdle();
                }, 50);
            }, 50);
        }, 50);
    }

    private calculateLIC() {
        this._licData = new Float64Array(this.grid.size);
        this.calcLicByLength(15);
    }

    private createImage(data: Float64Array): ImageDataArray {
        const imageData = new Uint8ClampedArray(this.grid.size * 4);
        for (let row = 0; row < this.grid.height; row++) {
            for (let col = 0; col < this.grid.width; col++) {
                const index = this.grid.getIndex(col, row);
                let value = Math.round(data[index] * 255);
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

        for (let row = 0; row < this.grid.height; row++) {
            for (let col = 0; col < this.grid.width; col++) {
                this._licData[this.grid.getIndex(col, row)] = this.calcLicPixel(col, row, l);
            }
            if (rowCnt > 49) {
                console.info('calculating: ' + Math.round(100 * row / this.grid.height) + '%');
                rowCnt = 0;
            }
            rowCnt++;
        }
        console.info('calculation done in ' + (Date.now() - timeStamp) / 1000 + 's');
    }

    private calcLicPixel(col: number, row: number, l: number): number {
        let brightness = this.calcLicPixelInDirection(col, row, l);
        brightness += this.calcLicPixelInDirection(col, row, l, -1);

        brightness = brightness / (2 * l);
        if (brightness > 1) brightness = 1;
        return brightness;
    }

    private calcLicPixelInDirection(col: number, row: number, l: number, direction: number = 1): number {
        let restDistance = l;
        let [vX, vY] = this._field.getVector(col + this._gridMargin, row + this._gridMargin);
        vX *= direction;
        vY *= direction;
        let nextArea = this.getNextArea(0.5, 0.5, vX, vY);
        let factor = (nextArea.distance < restDistance) ? nextArea.distance : restDistance;
        let brightness = this._sourceData[this._sourceGrid.getIndexForCenterArea(col, row)] * factor;
        restDistance = l - nextArea.distance;
        while (restDistance > 0) {
            row += nextArea.rowDiff;
            col += nextArea.colDiff;
            [vX, vY] = this._field.getVector(col + this._gridMargin, row + this._gridMargin);
            vX *= direction;
            vY *= direction;
            nextArea = this.getNextArea(nextArea.x, nextArea.y, vX, vY);
            factor = (nextArea.distance < restDistance) ? nextArea.distance : restDistance;
            brightness += (this._sourceData[this._sourceGrid.getIndexForCenterArea(col, row)] * factor);
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
                    rowDiff: -1,
                    colDiff: 0,
                    x: beta,
                    y: offset,
                    distance: distance
                }
            case 1: // Bottom
                beta = vX * alphas[borderIndex] + x;
                return {
                    rowDiff: 1,
                    colDiff: 0,
                    x: beta,
                    y: 1 - offset,
                    distance: distance
                }
            case 2: // Left
                beta = vY * alphas[borderIndex] + y;
                return {
                    rowDiff: 0,
                    colDiff: -1,
                    x: 1 - offset,
                    y: beta,
                    distance: distance
                }
            case 3: // Right
                beta = vY * alphas[borderIndex] + y;
                return {
                    rowDiff: 0,
                    colDiff: 1,
                    x: offset,
                    y: beta,
                    distance: distance
                }
            default:
                return {
                    rowDiff: 0,
                    colDiff: 0,
                    x: 0.5,
                    y: 0.5,
                    distance: distance
                }
        }
    }
}