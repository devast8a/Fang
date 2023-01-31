/**
 * Convert a tuple of types to a variant.
 * E.g. TupleToVariant<[number, string]> = number | string
 */
export type TupleToVariant<T extends any[]> =
    T extends [infer U, ...infer R] ? U | TupleToVariant<R> :
    never

/**
 * Check if two types are equal.
 * E.g. Equal<number, number> = true
 *
 * Implementation: https://github.com/Microsoft/TypeScript/issues/27024#issuecomment-421529650
 */
export type Equal<X, Y> =
    (<T>() => T extends X ? 1 : 2) extends
    (<T>() => T extends Y ? 1 : 2) ? true : false

/**
 * Used for creating type-level tests.
 * E.g. type tests = [Expect<Equal<typeof x, number>>, ...]
 */
export type Expect<T extends true> = never
export function Expect<T extends true>() { }

/**
 * Convert all properties of T to T | undefined
 * E.g. PartialUndefined<{ a: number, b: string }> = { a: number | undefined, b: string | undefined }
 */
export type PartialUndefined<T> = Partial<T>

/**
 * Convert all properties of T to T | null
 * E.g. PartialNull<{ a: number, b: string }> = { a: number | null, b: string | null }
 */
export type PartialNull<T> = { [key in keyof T]: T[key] | null }