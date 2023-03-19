import { assert } from './assert'

export function cached(target: Object, property: string, descriptor: PropertyDescriptor) {
    const original = descriptor.get
    const field = `__${property}_cache`

    assert(original !== undefined)

    descriptor.get = function (this: any) {
        let cached = this[field]

        if (cached === undefined) {
            cached = original.call(this)
            this[field] = cached
            return cached
        }

        return cached
    }

    return descriptor
}