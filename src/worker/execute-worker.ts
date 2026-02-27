import { BehaviorSubject, Observable } from 'rxjs';
import { CalculationState, MessageFromWorker, MessageToWorker } from './types';

export function executeWorker<T, U>(worker: Worker, setup: T, transferrable: Array<any> = []): Observable<CalculationState<U>> {
    const calculationState$ = new BehaviorSubject<CalculationState<U>>({ progress: 0 });

    worker.postMessage({ type: MessageToWorker.START, data: setup }, transferrable);
    worker.onmessage = (e) => {
        switch (e.data.type) {
            case MessageFromWorker.UPDATE: {
                calculationState$.next({ progress: e.data.progress });
                break;
            }
            case MessageFromWorker.RESULT: {
                calculationState$.next({ progress: 100, data: e.data.result as U });
                calculationState$.complete();
                worker.terminate();
                break;
            }
            default: { console.warn(`#executeWorker - unhandled message type: ${e.data.type}`) }
        }
    };
    return calculationState$;
}