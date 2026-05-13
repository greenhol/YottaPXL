export type ProgressUpdate = {
    percentage: number;
    estimate: number;
};

export const PROGRESS_INIT: ProgressUpdate = {
    percentage: 0,
    estimate: 0,
};

export const PROGRESS_DONE: ProgressUpdate = {
    percentage: 100,
    estimate: 0,
};

export class Progress {

    private _progressInterval: number;
    private _nextProgressThreshold: number;
    private _updateCount: number;
    private _start: number;
    private _goal: number;

    public static getProgressIntervalForResulution(size: number): number {
        return Math.min(0.05, Math.max(0.01, 0.05 / Math.sqrt(size / 921600))); // Reference for 5% updates: 1280x720=921600
    }

    constructor(goal: number, progressInterval: number = 0.05) {
        if (goal <= 0) throw new Error('goal must be a positive number');
        if (progressInterval <= 0 || progressInterval > 1) throw new Error('progressInterval must be between 0 and 1');

        this._progressInterval = progressInterval;
        this._nextProgressThreshold = progressInterval;
        this._updateCount = 0;

        this._start = Date.now();
        this._goal = goal;
    }

    public update(current: number): ProgressUpdate | null {
        const progress = current / this._goal;
        if (progress >= this._nextProgressThreshold) {
            this._updateCount++;
            this._nextProgressThreshold = this._updateCount * this._progressInterval;

            const elapsedTimeInSeconds = (Date.now() - this._start) / 1000;
            const totalEstimatedTimeInSeconds = elapsedTimeInSeconds / progress;
            const remainingTimeInSeconds = totalEstimatedTimeInSeconds - elapsedTimeInSeconds;

            return {
                percentage: Math.round(progress * 100),
                estimate: this._updateCount <= 2 ? 0 : Math.ceil(remainingTimeInSeconds),
            };
        }
        return null;
    }

    public logDone(prefix: string) {
        const duration = (Date.now() - this._start) / 1000;
        const color = (duration < 2) ? 'darkgreen' : 'darkorange';
        console.info(
            `${prefix} - calculation done in %c${duration}s`,
            `color: ${color}; font-weight: bold;`,
        );
    }
}
