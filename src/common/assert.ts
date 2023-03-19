import { Constructor } from './constructor'
import { expect } from 'chai'

export function assert(condition: boolean, message?: string): asserts condition {
    expect(condition, message).true
}

assert.equals = function <T>(actual: unknown, expected: T, message?: string): asserts actual is T {
    expect(actual).to.equal(expected, message)
}

assert.type = function<T>(actual: unknown, expected: Constructor<T>, message?: string): asserts actual is T {
    expect(actual).instanceof(expected, message)
}