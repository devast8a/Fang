export namespace Flags {
    export function has<T extends number>(flag: T, check: T) {
        return (flag & check) === check;
    }

    export function all<T extends number>(flag: T, check: T) {
        return (flag & check) === check;
    }

    export function set<T extends number>(flag: T, modify: T) {
        return flag | modify;
    }

    export function unset<T extends number>(flag: T, modify: T) {
        return flag & ~modify;
    }
}