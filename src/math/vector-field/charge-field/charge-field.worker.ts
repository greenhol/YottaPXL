import { GridWithMargin } from '../../../grid/grid-with-margin';
import { Progress } from '../../../worker/progress';
import { MessageFromWorker, MessageToWorker } from '../../../worker/types';
import { Charge } from './types';
import { WorkerSetupChargeField } from './worker-setup-charge-field';

self.onmessage = (e) => {
    const { type, data } = e.data;
    if (type === MessageToWorker.START) {
        const result = calculate(data);
        self.postMessage({ type: MessageFromWorker.RESULT, result }, [result.buffer]);
    }
};

function calculate(setup: WorkerSetupChargeField): Float32Array {
    const grid = GridWithMargin.copyWithMargin(setup.gridBlueprint);
    const data = new Float32Array(grid.size * 3);

    const progress = new Progress(grid.height, Progress.getProgressIntervalForResulution(grid.size));
    for (let row = 0; row < grid.height; row++) {
        for (let col = 0; col < grid.width; col++) {
            const [x, y] = grid.pixelToMath(col, row);
            const [vX, vY, magnitude] = computeVector(setup.charges, x, y);
            const index = grid.getIndex(col, row) * 3;
            data[index] = vX;
            data[index + 1] = vY;
            data[index + 2] = magnitude;
        }
        const progressUpdate = progress.update(row);
        if (progressUpdate) self.postMessage({ type: MessageFromWorker.UPDATE, progress: progressUpdate });
    }

    progress.logDone('#ChargeField (worker)');
    return data;
}

function computeVector(charges: Charge[], x: number, y: number): [number, number, number] {
    let vX = 0;
    let vY = 0;
    for (let i = 0; i < charges.length; i++) {
        const rdX = x - charges[i].x;
        const rdY = y - charges[i].y;
        const rdValue = Math.sqrt(rdX * rdX + rdY * rdY);
        vX += charges[i].charge * rdX / Math.pow(rdValue, 3);
        vY += charges[i].charge * rdY / Math.pow(rdValue, 3);
    }

    const magnitude = Math.sqrt(vX * vX + vY * vY);
    const value = Math.sqrt(vX * vX + vY * vY);
    return [
        vX / value,
        vY / value,
        magnitude,
    ];
}
