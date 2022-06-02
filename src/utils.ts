import { Node, Tag } from './ast/nodes';

function isNode(value: unknown): value is Node {
    return typeof (value) === 'object' && value !== null && typeof ((value as any).tag) === 'number';
}

function formatArgs(name: string, format: unknown, value: unknown) {
    if (typeof (format) === 'string') {
        if (value === undefined) {
            return `${name}: ${format}`;
        } else if (isNode(value)) {
            return `${name}: ${format.replace(/\{\}/g, Tag[value.tag])}`;
        } else {
            return `${name}: ${format.replace(/\{\}/g, value as any)}`;
        }
    } else if (isNode(format)) {
        return `${name} case ${Tag[format.tag]}`;
    } else {
        return `${name}: ${format}`;
    }
}

export function unreachable(value: never): never
export function unreachable(format: string): never
export function unreachable(format: string, value: never): never
export function unreachable(format: unknown, value?: unknown): never {
    throw new Error(formatArgs("Unreachable", format, value));
}

export function unimplemented(value: never): never
export function unimplemented(format: string): never
export function unimplemented(format: string, value: never): never
export function unimplemented(format: unknown, value?: unknown): never {
    throw new Error(formatArgs("Unimplemented", format, value));
}

export function assert(condition: boolean, reason?: string): asserts condition {
    if (!condition) {
        throw new Error(reason ?? "Asserted condition is false");
    }
}

export namespace MultiMapUtils {
    export function push<K, V>(map: Map<K, V[]>, key: K, value: V) {
        const v = map.get(key);

        if (v === undefined) {
            map.set(key, [value]);
        } else {
            v.push(value);
        }
    }

    export function pushMulti<K, V>(map: Map<K, V[]>, key: K, values: V[]) {
        const v = map.get(key);

        if (v === undefined) {
            map.set(key, values);
        } else {
            v.push(...values);
        }
    }

    export function add<K, V>(map: Map<K, Set<V>>, key: K, value: V) {
        const v = map.get(key);

        if (v === undefined) {
            map.set(key, new Set([value]));
        } else {
            v.add(value);
        }
    }

    export function addMulti<K, V>(map: Map<K, Set<V>>, key: K, values: V[]) {
        const v = map.get(key);

        if (v === undefined) {
            map.set(key, new Set(values));
        } else {
            for (const value of values) {
                v.add(value);
            }
        }
    }
}

export namespace MapUtils {
    export function toObject<V>(map: Map<string, V>) {
        const output = {} as {[key: string]: V};
        
        for (const [key, value] of map) {
            output[key] = value;
        }

        return output;
    }
}