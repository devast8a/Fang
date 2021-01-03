/**
 * @name Bisect
 * @cost_time O(log array.length)
 * @cost_memory O(1)
 * 
 * @returns an index using binary search where the predicate returns false for all elements to the left of the index AND
 *      where the predicate returns true for all elements to the right of the index.
 * 
 * Bisect has undefined behavior if the return condition can not be satisfied.
 * 
 * The returned index is the index of the first element where predicate returns true.
 * If all elements return true, then the index zero is returned
 * If all elements return false, then the length of the array is returned
 */
export function bisect<T>(
    array: readonly T[],
    predicate: (value: T, index: number, array: readonly T[]) => boolean
) {
    let start = 0;
    let end = array.length;

    while (start < end) {
        const midpoint = Math.floor(start + (end - start) / 2);

        if (predicate(array[midpoint], midpoint, array)) {
            end = midpoint;
        } else {
            start = midpoint + 1;
        }
    }

    return end;
}