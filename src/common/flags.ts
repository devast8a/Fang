export namespace Flags {
    export function has<T extends number>(flag: T, check: T) {
        return (flag & check) === check;
    }
}