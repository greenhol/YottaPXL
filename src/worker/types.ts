import { ProgressUpdate } from './progress';

export interface CalculationState<T> {
    progress: ProgressUpdate;
    data?: T;
}

export enum MessageToWorker {
    START = 'START',
}

export enum MessageFromWorker {
    UPDATE = 'UPDATE',
    RESULT = 'RESULT',
}
