import { MapUtils } from '../common/utils'
import { Node, Tag } from './nodes'
import { Scope } from "./Scope"

export function serialize(nodes: Node[]) {
    return JSON.stringify(nodes, replace, 4)
}

function replace(this: any, key: string, value: any) {
    if (key === 'scope' && value.constructor === Scope) {
        return MapUtils.toObject((value as any).declared)
    }

    if (key === 'parent' && value.constructor === Scope) {
        return undefined
    }

    if (key === 'tag') {
        //return Tag[value]
    }

    return value
}