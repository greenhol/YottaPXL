import { lastValueFrom, Observable } from 'rxjs';
import { CalculationState } from './types';

export async function extractData<T>(observable: Observable<CalculationState<T>>, name: string): Promise<T> {
    const result = await lastValueFrom(observable);
    if (result.data === null) {
        throw Error(`#extractData - calculation did not produce data for ${name}`);
    };
    return result.data!;
}