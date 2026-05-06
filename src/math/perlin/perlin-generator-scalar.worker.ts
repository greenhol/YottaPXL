import { GridWithMargin } from '../../grid/grid-with-margin';
import { MessageFromWorker, MessageToWorker } from '../../worker/types';
import { buildLayers, clampScaleFactor, perlinScalarSample } from './perlin-utils';
import { WorkerSetupPerlin } from './worker-setup-perlin';

const PROGRESS_INTERVAL = 0.05; // report every 5 %

self.onmessage = (e) => {
    const timeStamp = Date.now();
    const { type, data }: { type: MessageToWorker, data: WorkerSetupPerlin; } = e.data;
    if (type === MessageToWorker.START) {
        const grid = GridWithMargin.copyWithMargin(data.gridBlueprint);
        const result: Float32Array = calculate(grid, data.scaleFactor, data.octaveCount, data.octaveAmplitudeFactor);
        console.info(`#NoiseGeneratorPerlin (worker) - calculation done in ${(Date.now() - timeStamp) / 1000}s`);
        self.postMessage({ type: MessageFromWorker.RESULT, result }, [result.buffer]);
    }
};

function calculate(
    grid: GridWithMargin,
    scaleFactor: number,
    octaveCount: number,
    octaveAmplitudeFactor: number,
): Float32Array {
    const xMin = grid.range.xMin.toNumber();
    const xMax = grid.range.xMax.toNumber();
    const yMin = grid.yMin.toNumber();
    const yMax = grid.yMax.toNumber();

    const clampedScaleFactor = clampScaleFactor(scaleFactor, grid);
    const layers = buildLayers(xMin, xMax, yMin, yMax, clampedScaleFactor, octaveCount, octaveAmplitudeFactor);

    const data = new Float32Array(grid.size);

    let rawMin = Infinity;
    let rawMax = -Infinity;

    // --- Pass 1: accumulate all layers per pixel ---
    let nextProgressThreshold = PROGRESS_INTERVAL;

    for (let row = 0; row < grid.height; row++) {
        for (let col = 0; col < grid.width; col++) {
            const [mx, my] = grid.pixelToMath(col, row);

            let value = 0;
            for (let l = 0; l < layers.length; l++) {
                const { grid: g, amplitude, scaleFactor: sf } = layers[l];
                value += amplitude * perlinScalarSample(mx, my, g, sf);
            }

            const idx = grid.getIndex(col, row);
            data[idx] = value;

            if (value < rawMin) rawMin = value;
            if (value > rawMax) rawMax = value;
        }

        // Progress updates cover 0–90% during pass 1
        const progress = ((row + 1) / grid.height) * 0.9;
        if (progress >= nextProgressThreshold) {
            self.postMessage({ type: MessageFromWorker.UPDATE, progress: Math.round(progress * 100) });
            nextProgressThreshold += PROGRESS_INTERVAL;
        }
    }

    // --- Pass 2: normalise to [0, 1] ---
    const range = rawMax - rawMin || 1; // guard against flat noise
    for (let i = 0; i < data.length; i++) {
        data[i] = (data[i] - rawMin) / range;
    }

    // Final progress update after both passes complete
    self.postMessage({ type: MessageFromWorker.UPDATE, progress: 100 });

    return data;
}
