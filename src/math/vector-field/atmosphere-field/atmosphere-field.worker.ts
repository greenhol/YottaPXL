import { XoRng } from '../../../../shared/xo-rng';
import { GridWithMargin } from '../../../grid/grid-with-margin';
import { Progress } from '../../../worker/progress';
import { MessageFromWorker, MessageToWorker } from '../../../worker/types';
import { buildLayers, clampScaleFactor, PerlinLayer, perlinScalarSampleForLayer } from '../../perlin/perlin-utils';
import { AtmosphereDescriptor } from './types';
import { WorkerSetupAtmosphereField } from './worker-setup-atmosphere-field';

const NO_WIND: [number, number, number] = [0, 0, 0];

type PerlinLayers = {
    warp: {
        x: PerlinLayer,
        y: PerlinLayer,
    };
    band: {
        amplitude: PerlinLayer,
        phase: PerlinLayer,
        freqMod: PerlinLayer,
    },
    perturbation: {
        x: PerlinLayer,
        y: PerlinLayer,
    };
};

self.onmessage = (e) => {
    const { type, data }: { type: MessageToWorker, data: WorkerSetupAtmosphereField; } = e.data;
    if (type === MessageToWorker.START) {
        const result = calculate(data);
        self.postMessage({ type: MessageFromWorker.RESULT, result }, [result.buffer]);
    }
};

function calculate(setup: WorkerSetupAtmosphereField): Float32Array {
    const grid = GridWithMargin.copyWithMargin(setup.gridBlueprint);
    const descr = setup.atmosphereDescriptor;
    const data = new Float32Array(grid.size * 3);
    const yDiff = descr.yMax - descr.yMin;

    const perlinLayers: PerlinLayers = {
        warp: {
            x: buildLayers(new XoRng(descr.seed + 0), descr.xMin * 2, descr.xMax * 2, descr.yMin * 2, descr.yMax * 2, descr.perlinWarpX.interval, 0, 1)[0],
            y: buildLayers(new XoRng(descr.seed + 1), descr.xMin * 2, descr.xMax * 2, descr.yMin * 2, descr.yMax * 2, descr.perlinWarpX.interval, 0, 1)[0],
        },
        band: {
            amplitude: buildLayers(new XoRng(descr.seed + 2), descr.xMin * 2, descr.xMax * 2, descr.yMin * 2, descr.yMax * 2, clampScaleFactor(descr.perlinBandAmplitude.interval, grid), 0, 1)[0],
            phase: buildLayers(new XoRng(descr.seed + 3), descr.xMin * 2, descr.xMax * 2, descr.yMin * 2, descr.yMax * 2, clampScaleFactor(descr.perlinBandPhase.interval, grid), 0, 1)[0],
            freqMod: buildLayers(new XoRng(descr.seed + 4), descr.xMin * 2, descr.xMax * 2, descr.yMin * 2, descr.yMax * 2, clampScaleFactor(descr.perlinBandFreqMod.interval, grid), 0, 1)[0],
        },
        perturbation: {
            x: buildLayers(new XoRng(descr.seed + 5), descr.xMin * 2, descr.xMax * 2, descr.yMin * 2, descr.yMax * 2, descr.perlinPerturbationX.interval, 0, 1)[0],
            y: buildLayers(new XoRng(descr.seed + 6), descr.xMin * 2, descr.xMax * 2, descr.yMin * 2, descr.yMax * 2, descr.perlinPerturbationY.interval, 0, 1)[0],
        }
    };

    const progress = new Progress(grid.height, Progress.getProgressIntervalForResulution(grid.size));
    for (let row = 0; row < grid.height; row++) {
        for (let col = 0; col < grid.width; col++) {
            const [x, y] = grid.pixelToMath(col, row);
            const [vX, vY, magnitude] = computeVector(x, y, yDiff, perlinLayers, descr);
            const index = grid.getIndex(col, row) * 3;
            data[index] = vX;
            data[index + 1] = vY;
            data[index + 2] = magnitude;
        }
        const progressUpdate = progress.update(row);
        if (progressUpdate) self.postMessage({ type: MessageFromWorker.UPDATE, progress: progressUpdate });
    }

    progress.logDone('#AtmosphereField (worker)');
    return data;
}

function computeVector(
    x: number,
    y: number,
    yDiff: number,
    perlinLayers: PerlinLayers,
    descr: AtmosphereDescriptor,
): [number, number, number] {
    // Domain warping — offset coordinates before evaluating bands and vortices
    const wx = x + perlinScalarSampleForLayer(x, y, perlinLayers.warp.x) * descr.warpStrength;
    const wy = y + perlinScalarSampleForLayer(x, y, perlinLayers.warp.y) * descr.warpStrength;

    // Bands — use warped coordinates
    const amplitude = 1 + perlinScalarSampleForLayer(perlinLayers.band.amplitude.scaleFactor, wy, perlinLayers.band.amplitude) * descr.amplitudeFactor;
    const phase = perlinScalarSampleForLayer(perlinLayers.band.phase.scaleFactor, wy, perlinLayers.band.phase) * Math.PI * descr.phaseFactor;
    const freqMod = 1 + perlinScalarSampleForLayer(perlinLayers.band.freqMod.scaleFactor, wy, perlinLayers.band.freqMod) * descr.freqModFactor;

    let vX = Math.sin(wy / yDiff * descr.bandCount * Math.PI * freqMod + phase) * amplitude;
    let vY = 0;

    descr.vortices.forEach((vortex) => {
        const dx = wx - vortex.x0;
        const dy = wy - vortex.y0;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const strength = Math.exp(-(dist * dist) / (2 * vortex.r * vortex.r));
        vX += -dy * strength * vortex.speed;
        vY += dx * strength * vortex.speed;
    });

    // Perturbation — uses original coordinates intentionally
    vX += perlinScalarSampleForLayer(x, y, perlinLayers.perturbation.x) * descr.perturbationWeight;
    vY += perlinScalarSampleForLayer(x, y, perlinLayers.perturbation.y) * descr.perturbationWeight;

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