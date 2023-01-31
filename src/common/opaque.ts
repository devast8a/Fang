export type Deopaque<O extends Opaque> =
    O extends Opaque<any, infer T> ? T :
    never;

export class Opaque<N = string, T = unknown> {
    private readonly name!: N;
    private readonly type!: T;

    static opaque<O extends Opaque>(value: Deopaque<O>): O {
        return value as unknown as O;
    }

    static deopaque<O extends Opaque>(value: O): Deopaque<O> {
        return value as unknown as Deopaque<O>;
    }
}