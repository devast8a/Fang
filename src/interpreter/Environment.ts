import { Ctx } from '../ast/context';
import { Distance, Node, Ref, RefById } from '../ast/nodes';
import { assert } from '../utils';

export class Environment {
    private readonly global: Environment;

    private constructor(
        public readonly ctx: Ctx,
        global: Environment | null,
        private readonly parent: Environment | null,
        public readonly values: any[],
    ) {
        this.global = global ?? this;
    }
    
    public static create(ctx: Ctx) {
        return new Environment(ctx, null, null, []);
    }

    public createChildEnvironment() {
        return new Environment(this.ctx, this.global, this, []);
    }

    public get<T extends Node>(ref: Ref<T>): T {
        assert(ref instanceof RefById, 'Ref passed to VmEnvironment has not been completely resolved');

        const env = this.getEnvironment(ref.distance);
        return env.values[ref.id];
    }

    public set(ref: Ref, value: any) {
        assert(ref instanceof RefById, 'Ref passed to VmEnvironment has not been completely resolved');

        const env = this.getEnvironment(ref.distance);
        env.values[ref.id] = value;
    }

    private getEnvironment(distance: number | Distance.Global) {
        if (distance === Distance.Global) {
            return this.global;
        }

        let env: Environment = this;
        while (distance-- > 0) {
            if (env.parent === null) {
                throw new Error()
            }

            env = env.parent;
        }

        return env;
    }
}