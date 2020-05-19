export function bisect<T>(
    array: T[],
    predicate: (value: T, index: number, array: T[]) => boolean
){
    let start = 0;
    let end = array.length;

    while(start < end){
        const midpoint = Math.floor(start + (end - start) / 2);

        if(predicate(array[midpoint], midpoint, array)){
            end = midpoint;
        } else {
            start = midpoint + 1;
        }
    }

    return end;
}