import { XoRng } from '../../../shared/xo-rng';
import { GridWithMargin } from '../../grid/grid-with-margin';
import { PROGRESS_DONE, Progress } from '../../worker/progress';
import { MessageFromWorker, MessageToWorker } from '../../worker/types';
import { buildLayers, clampScaleFactor, perlinGradientSample } from './perlin-utils';
import { WorkerSetupPerlin } from './worker-setup-perlin';

self.onmessage = (e) => {
    const { type, data }: { type: MessageToWorker, data: WorkerSetupPerlin; } = e.data;
    if (type === MessageToWorker.START) {
        const grid = GridWithMargin.copyWithMargin(data.gridBlueprint);
        const result: Float32Array = calculate(grid, new XoRng(data.seed), data.scaleFactor, data.octaveCount, data.octaveAmplitudeFactor);
        self.postMessage({ type: MessageFromWorker.RESULT, result }, [result.buffer]);
    }
};

function calculate(
    grid: GridWithMargin,
    rng: XoRng,
    scaleFactor: number,
    octaveCount: number,
    octaveAmplitudeFactor: number,
): Float32Array {
    const xMin = grid.range.xMin.toNumber();
    const xMax = grid.range.xMax.toNumber();
    const yMin = grid.yMin.toNumber();
    const yMax = grid.yMax.toNumber();

    const clampedScaleFactor = clampScaleFactor(scaleFactor, grid);
    const layers = buildLayers(rng, xMin, xMax, yMin, yMax, clampedScaleFactor, octaveCount, octaveAmplitudeFactor);

    // [vx, vy, rawAmplitude, normalisedAmplitude] per pixel
    // normalisedAmplitude is filled in pass 2
    const data = new Float32Array(grid.size * 3);

    let rawAmpMin = Infinity;
    let rawAmpMax = -Infinity;

    // --- Pass 1: accumulate gradient layers per pixel ---
    const progress = new Progress(grid.height);
    for (let row = 0; row < grid.height; row++) {
        for (let col = 0; col < grid.width; col++) {
            const [mx, my] = grid.pixelToMath(col, row);

            // Accumulate weighted gradient contributions across all layers
            let accX = 0;
            let accY = 0;
            for (let l = 0; l < layers.length; l++) {
                const { grid: g, amplitude, scaleFactor: sf } = layers[l];
                const [gx, gy] = perlinGradientSample(mx, my, g, sf);
                accX += amplitude * gx;
                accY += amplitude * gy;
            }

            // Raw amplitude is the magnitude of the accumulated gradient
            const rawAmplitude = Math.sqrt(accX * accX + accY * accY);

            // Normalise to unit vector — guard against zero vector
            const invMag = rawAmplitude > 0 ? 1 / rawAmplitude : 0;

            const idx = grid.getIndex(col, row) * 3;
            data[idx] = accX * invMag; // vx
            data[idx + 1] = accY * invMag; // vy
            data[idx + 2] = rawAmplitude;  // rawAmplitude (normalised in pass 2)

            if (rawAmplitude < rawAmpMin) rawAmpMin = rawAmplitude;
            if (rawAmplitude > rawAmpMax) rawAmpMax = rawAmplitude;
        }

        const progressUpdate = progress.update(row);
        if (progressUpdate) self.postMessage({ type: MessageFromWorker.UPDATE, progress: progressUpdate });
    }

    // --- Pass 2: normalised Amplitude ---
    const ampRange = rawAmpMax - rawAmpMin || 1; // guard against flat field
    for (let i = 0; i < grid.size; i++) {
        const idx = i * 3;
        data[idx + 2] = (data[idx + 2] - rawAmpMin) / ampRange;
    }

    // Final progress update after both passes complete
    self.postMessage({ type: MessageFromWorker.UPDATE, progress: PROGRESS_DONE });

    progress.logDone('#PerlinGeneratorVector (worker)');
    return data;
}
