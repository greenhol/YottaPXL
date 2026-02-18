import { GridWithMargin } from '../../grid/grid-with-margin';
import { VectorField } from './vector-field';

interface PressureRegion {
    x: number;
    y: number;
    strength: number;
    spread: number;
    isLowPressure: boolean;
};

const NO_WIND: [number, number, number] = [0, 0, 0];
const NORTH = 90;
const SOUTH = -90;

export class WeatherVectorField extends VectorField {

    private _pressureRegions: PressureRegion[] = [];
    private _coriolisForce: number = 1;

    constructor(grid: GridWithMargin) {
        super(grid);
        const pressureRegions = [
            { x: 0.0, y: -70.0, strength: 988, spread: 36, isLowPressure: true },      // Antarctic Low (Low)
            { x: 95.0, y: 60.0, strength: 1036, spread: 36, isLowPressure: false },   // Siberian High (High)
            { x: 135.0, y: -25.0, strength: 1000, spread: 36, isLowPressure: true },   // Australian Low (Low)
            { x: 145.0, y: 45.0, strength: 1028, spread: 36, isLowPressure: false },   // North Pacific High (High)
            { x: 170.0, y: 52.0, strength: 992, spread: 36, isLowPressure: true },    // Aleutian Low (Low)
            { x: 265.0, y: 35.0, strength: 1026, spread: 36, isLowPressure: false },  // North American High (Bermuda High)
            { x: 270.0, y: 55.0, strength: 996, spread: 36, isLowPressure: true },    // Canadian Low (Low)
            { x: 280.0, y: -30.0, strength: 1020, spread: 36, isLowPressure: false },  // South Pacific High (High)
            { x: 340.0, y: 38.0, strength: 1024, spread: 36, isLowPressure: false },  // Azores High (High)
            { x: 340.0, y: 65.0, strength: 980, spread: 36, isLowPressure: true },    // Icelandic Low (Low)
        ];
        // const pressureRegions = [
        //     { x: 90, y: 30, strength: 1000, spread: 36, isLowPressure: true },
        //     { x: 270, y: -45, strength: 1000, spread: 36, isLowPressure: false },
        // ];
        // const pressureRegions = [];
        // for (let index = 0; index < 10; index++) {
        //     pressureRegions.push({
        //         x: Math.random() * 360,
        //         y: SOUTH + Math.random() * (NORTH - SOUTH),
        //         strength: (0.25 + Math.random()) * 1000,
        //         spread: 36,
        //         isLowPressure: Math.round(Math.random()) == 0,
        //     });
        // }

        pressureRegions.forEach((region) => {
            const regionLeft = structuredClone(region);
            regionLeft.x -= 360;
            const regionRight = structuredClone(region);
            regionRight.x += 360;
            this._pressureRegions.push(regionLeft);
            this._pressureRegions.push(region);
            this._pressureRegions.push(regionRight);
        });

        this._coriolisForce = 1;
        this.precomputeVectors();
    }

    override computeVector(x: number, y: number): [number, number, number] {
        const [dPdX, dPdY] = this.getGradient(x, y);
        const vXgeostrophic = this.getCoriolisFactor(y) * dPdY;
        const vYgeostrophic = -this.getCoriolisFactor(y) * dPdX;

        // Ageostrophic component (small fraction of gradient, toward low pressure)
        const ageostrophicFraction = 0.1; // Adjust as needed
        const vXageostrophic = -ageostrophicFraction * dPdX;
        const vYageostrophic = -ageostrophicFraction * dPdY;
        // Combine components
        const vX = vXgeostrophic + vXageostrophic;
        const vY = vYgeostrophic + vYageostrophic;

        const magnitude = Math.sqrt(vX * vX + vY * vY);
        if (magnitude > 0) {
            return [
                vX,
                vY,
                magnitude,
            ];
        } else {
            return NO_WIND;
        }
    }

    private getPressure(x: number, y: number): number {
        let pressure = 0;
        for (const region of this._pressureRegions) {
            const dx = x - region.x;
            const dy = y - region.y;
            const distSq = dx * dx + dy * dy;
            const contribution = region.strength * Math.exp(-distSq / (2 * region.spread * region.spread));
            pressure += region.isLowPressure ? -contribution : contribution;
        }
        return pressure;
    }

    private getGradient(x: number, y: number): [number, number] {
        let dPdX = 0;
        let dPdY = 0;
        for (const region of this._pressureRegions) {
            const dx = x - region.x;
            const dy = y - region.y;
            const distSq = dx * dx + dy * dy;
            const expTerm = Math.exp(-distSq / (2 * region.spread * region.spread));
            const coeff = region.strength * expTerm / (region.spread * region.spread);
            dPdX += region.isLowPressure ? -coeff * dx : coeff * dx;
            dPdY += region.isLowPressure ? -coeff * dy : coeff * dy;
        }
        return [dPdX, dPdY];
    }

    private getCoriolisFactor(y: number): number {
        if (y > NORTH) y = NORTH;
        if (y < SOUTH) y = SOUTH;

        // Convert y to latitude in radians: y ∈ [-3, 3] → φ ∈ [-π/2, π/2]
        const phi = (y * Math.PI) / (NORTH - SOUTH);
        // Coriolis factor: sin(φ)
        return Math.sin(phi) * this._coriolisForce;
    }
}