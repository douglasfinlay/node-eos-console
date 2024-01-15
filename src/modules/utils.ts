import { AssertionError } from 'node:assert';

export function assertNonNullArray<T>(
    arr: (T | null)[],
    message?: string,
): asserts arr is T[] {
    if (arr.some(item => item === null)) {
        throw new AssertionError({ message });
    }
}
