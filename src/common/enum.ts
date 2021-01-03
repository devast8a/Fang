type Enum = {
    [value: string]: number | string;
};
export namespace Enum {
    export function getMaximumValue(e: Enum) {
        const numbers = Object.values(e).filter(x => typeof(x) === 'number') as number[];
        return Math.max(...numbers);
    }

    export function getCount(e: Enum) {
        return Object.values(e).filter(x => typeof(x) === 'number').length;
    }
}