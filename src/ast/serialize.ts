import { MapUtils } from '../utils';
import { Node, Scope, Tag } from './nodes';

export function serialize(node: Node | Node[]) {
    return JSON.stringify(node, replace, 4);
}

function replace(this: any, key: string, value: any) {
    if (key === 'scope' && value.constructor === Scope) {
        return MapUtils.toObject(value.symbols);
    }
    
    if (key === 'parent' && value.constructor === Scope) {
        return undefined;
    }

    if (key === 'tag') {
        return Tag[value];
    }

    return value;
}