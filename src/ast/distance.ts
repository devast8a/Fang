import { Opaque } from '../common/opaque'

export type Distance = Opaque<'Bind', number>
export namespace Distance {
    export const Local = Opaque.opaque<Distance>(0)
    export const Global = Opaque.opaque<Distance>(-1)

    export function from(value: number): Distance {
        return Opaque.opaque<Distance>(value)
    }
}
