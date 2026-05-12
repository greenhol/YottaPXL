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

    constructor(goal: number, progressInterval: number = 0.05) {
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
}
