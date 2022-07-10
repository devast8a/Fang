import { Constructor } from '../common/constructor';
import { Builder } from '../grammar/generator';
import { unreachable } from '../utils';
import { Context } from './context';
import { Node, RefId, RefName, Scope } from './nodes';

export type RewriteParameters<T extends any[]> = {
    [K in keyof T]: T[K] extends Scope ? Context : (T[K] | Builder<T[K], Context>);
} & {
    length: T['length'];
}

export function make<T extends Node, Parameters extends any[]>(constructor: Constructor<T, Parameters>, ...args: RewriteParameters<Parameters>): RefId {
    if (!(args[0] instanceof Context)) {
        throw unreachable('The first argument must always be context');
    }
    const ctx = args[0];

    const a = args.map(arg => {
        if (arg instanceof Context) {
            return arg.scope;
        }
        if (arg instanceof Builder) {
            return arg.build(ctx);
        }
        return arg;
    }) as any;

    return ctx.add(new constructor(...a));
}

export function ref(name: string) {
    return new RefName(name);
}