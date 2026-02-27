export interface CalculationState<T> {
    progress: number;
    data?: T;
}

export enum MessageToWorker {
    START = 'START',
}

export enum MessageFromWorker {
    UPDATE = 'UPDATE',
    RESULT = 'RESULT',
}
