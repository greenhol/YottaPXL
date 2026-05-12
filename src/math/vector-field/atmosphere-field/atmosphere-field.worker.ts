import { XoRng } from '../../../../shared/xo-rng';
import { GridWithMargin } from '../../../grid/grid-with-margin';
import { Progress } from '../../../worker/progress';
import { MessageFromWorker, MessageToWorker } from '../../../worker/types';
import { buildLayers, clampScaleFactor, PerlinLayer, perlinScalarSampleForLayer } from '../../perlin/perlin-utils';
import { WorkerSetupAtmosphereField } from './worker-setup-atmosphere-field';

interface Vortex {
    x0: number,
    y0: number,
    r: number,
    speed: number,
}

const VORTICES: Vortex[] = [
    { x0: -90, y0: -40, r: 12, speed: 0.4 },
    { x0: 20, y0: 60, r: 15, speed: 0.3 },
    { x0: 100, y0: -60, r: 10, speed: 0.6 },
    { x0: -120, y0: 33, r: 8, speed: 0.5 },
    { x0: -75, y0: 80, r: 11, speed: 0.15 },
    { x0: -15, y0: -65, r: 6, speed: 0.5 },
    { x0: 55, y0: -20, r: 8, speed: 0.2 },
    { x0: 140, y0: 33, r: 5, speed: 0.5 },
];

const NO_WIND: [number, number, number] = [0, 0, 0];

self.onmessage = (e) => {
    let timeStamp = Date.now();
    const { type, data }: { type: MessageToWorker, data: WorkerSetupAtmosphereField; } = e.data;
    if (type === MessageToWorker.START) {
        const result = calculate(data);
        console.info(`#AtmosphereField (worker) - calculation done in ${(Date.now() - timeStamp) / 1000}s`);
        self.postMessage({ type: MessageFromWorker.RESULT, result }, [result.buffer]);
    }
};

function calculate(setup: WorkerSetupAtmosphereField): Float32Array {
    const grid = GridWithMargin.copyWithMargin(setup.gridBlueprint);
    const data = new Float32Array(grid.size * 3);
    const yDiff = grid.yMax.sub(grid.yMin).toNumber();

    const xMin = grid.range.xMin.toNumber();
    const xMax = grid.range.xMax.toNumber();
    const yMin = grid.yMin.toNumber();
    const yMax = grid.yMax.toNumber();

    const perlinBandAmplitude = buildLayers(new XoRng(null), xMin, xMax, yMin, yMax, clampScaleFactor(8, grid), 0, 1)[0];
    const perlinBandPhase = buildLayers(new XoRng(null), xMin, xMax, yMin, yMax, clampScaleFactor(8, grid), 0, 1)[0];
    const perlinBandFreqMod = buildLayers(new XoRng(null), xMin, xMax, yMin, yMax, clampScaleFactor(8, grid), 0, 1)[0];
    const clampedScaleFactor = clampScaleFactor(12, grid); // Grid size of x°
    const perlinX = buildLayers(new XoRng(null), xMin, xMax, yMin, yMax, clampedScaleFactor, 0, 1)[0];
    const perlinY = buildLayers(new XoRng(null), xMin, xMax, yMin, yMax, clampedScaleFactor, 0, 1)[0];

    // const rng = new XoRng(0);
    // for (let index = 0; index < 50; index++) {
    //     VORTICES.push({
    //         x0: rng.nextInRange(-180, 180),
    //         y0: rng.nextInRange(-100, 100),
    //         r: rng.nextInRange(3, 12),
    //         speed: rng.nextInRange(0.1, 0.7),
    //     });
    // }

    const progress = new Progress(grid.height);
    for (let row = 0; row < grid.height; row++) {
        for (let col = 0; col < grid.width; col++) {
            const [x, y] = grid.pixelToMath(col, row);
            const [vX, vY, magnitude] = computeVector(x, y, yDiff, perlinBandAmplitude, perlinBandPhase, perlinBandFreqMod, perlinX, perlinY);
            const index = grid.getIndex(col, row) * 3;
            data[index] = vX;
            data[index + 1] = vY;
            data[index + 2] = magnitude;
        }
        const progressUpdate = progress.update(row);
        if (progressUpdate) self.postMessage({ type: MessageFromWorker.UPDATE, progress: progressUpdate });
    }
    return data;
}

function computeVector(
    x: number,
    y: number,
    yDiff: number,
    perlinBandAmplitude: PerlinLayer,
    perlinBandPhase: PerlinLayer,
    perlinBandFreqMod: PerlinLayer,
    perlinX: PerlinLayer,
    perlinY: PerlinLayer,
): [number, number, number] {
    // Bands
    const amplitudeFactor = 0.3;
    const amplitude = 1 + perlinScalarSampleForLayer(perlinBandAmplitude.scaleFactor / 2, y, perlinBandAmplitude) * amplitudeFactor;

    const phaseFactor = 0.2;
    const phase = perlinScalarSampleForLayer(perlinBandPhase.scaleFactor / 2, y, perlinBandPhase) * Math.PI * phaseFactor;

    const freqModFactor = 0.3;
    const freqMod = 1 + perlinScalarSampleForLayer(perlinBandFreqMod.scaleFactor / 2, y, perlinBandFreqMod) * freqModFactor;

    let vX = Math.sin(y / yDiff * 5 * Math.PI * freqMod + phase) * amplitude;
    let vY = 0;

    VORTICES.forEach((vortex) => {
        const dx = x - vortex.x0;
        const dy = y - vortex.y0;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const strength = Math.exp(-(dist * dist) / (2 * vortex.r * vortex.r));
        vX += -dy * strength * vortex.speed;
        vY += dx * strength * vortex.speed;
    });

    // Perlin Noise
    vX += perlinScalarSampleForLayer(x, y, perlinX) * .75;
    vY += perlinScalarSampleForLayer(x, y, perlinY) * .75;

    const magnitude = Math.sqrt(vX * vX + vY * vY);
    if (magnitude > 0) {
        return [
            vX / magnitude,
            vY / magnitude,
            magnitude,
        ];
    } else {
        return NO_WIND;
    }
}