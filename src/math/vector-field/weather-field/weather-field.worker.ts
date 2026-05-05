import { GridWithMargin } from '../../../grid/grid-with-margin';
import { MessageFromWorker, MessageToWorker } from '../../../worker/types';
import { PressureRegion } from './types';
import { WorkerSetupWeatherField } from './worker-setup-weather-field';

const NO_WIND: [number, number, number] = [0, 0, 0];
const NORTH = 90;
const SOUTH = -90;

self.onmessage = (e) => {
    let timeStamp = Date.now();
    const { type, data } = e.data;
    if (type === MessageToWorker.START) {
        const result = calculate(data);
        console.info(`#WeatherField (worker) - calculation done in ${(Date.now() - timeStamp) / 1000}s`);
        self.postMessage({ type: MessageFromWorker.RESULT, result }, [result.buffer]);
    }
};

function calculate(setup: WorkerSetupWeatherField): Float32Array {
    const grid = GridWithMargin.copyWithMargin(setup.gridBlueprint);
    const data = new Float32Array(grid.size * 3);
    let cnt = 0;

    for (let row = 0; row < grid.height; row++) {
        for (let col = 0; col < grid.width; col++) {
            const [x, y] = grid.pixelToMath(col, row);
            const [vX, vY, magnitude] = computeVector(setup.regions, setup.coriolisForce, x, y);
            const index = grid.getIndex(col, row) * 3;
            data[index] = vX;
            data[index + 1] = vY;
            data[index + 2] = magnitude;
        }
        cnt += grid.width;
        if (cnt > 50000) {
            const progress = Math.round(100 * (row * grid.width) / grid.size);
            self.postMessage({ type: MessageFromWorker.UPDATE, progress });
            cnt = 0;
        }
    }
    return data;
}

function computeVector(regions: PressureRegion[], coriolisForce: number, x: number, y: number): [number, number, number] {
    const [dPdX, dPdY] = getGradient(regions, coriolisForce, x, y);
    const vXgeostrophic = getCoriolisFactor(coriolisForce, y) * dPdY;
    const vYgeostrophic = -getCoriolisFactor(coriolisForce, y) * dPdX;

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

function getPressure(regions: PressureRegion[], coriolisForce: number, x: number, y: number): number {
    let pressure = 0;
    for (const region of regions) {
        const dx = x - region.x;
        const dy = y - region.y;
        const distSq = dx * dx + dy * dy;
        const contribution = region.strength * Math.exp(-distSq / (2 * region.spread * region.spread));
        pressure += region.isLowPressure ? -contribution : contribution;
    }
    return pressure;
}

function getGradient(regions: PressureRegion[], coriolisForce: number, x: number, y: number): [number, number] {
    let dPdX = 0;
    let dPdY = 0;
    for (const region of regions) {
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

function getCoriolisFactor(coriolisForce: number, y: number): number {
    if (y > NORTH) y = NORTH;
    if (y < SOUTH) y = SOUTH;

    // Convert y to latitude in radians: y ∈ [-3, 3] → φ ∈ [-π/2, π/2]
    const phi = (y * Math.PI) / (NORTH - SOUTH);
    // Coriolis factor: sin(φ)
    return Math.sin(phi) * coriolisForce;
}