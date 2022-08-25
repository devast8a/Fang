import { Function } from '../../ast/nodes';
import { Control } from '../Control';
import { evaluate } from '../Interpreter';
import { Environment } from '../Environment';

export class VmFunction {
    constructor(
        readonly env: Environment,
        readonly fn: Function,
    ) { }

    call(self: any, args: any[]) {
        const env = this.env.createChildEnvironment();
        const parameters = this.fn.parameters;

        let index = 0;

        // Might need to load self
        if (parameters.length > 0) {
            const first = env.ctx.get(parameters[0]);

            if (first.name === 'self') {
                env.values[first.id] = self;
                index++;
            }
        }

        for (const arg of args) {
            const p = env.ctx.get(parameters[index]);
            env.values[p.id] = arg;
            index++;
        }

        for (const ref of this.fn.body) {
            const control = evaluate(env, ref);

            if (control instanceof Control) {
                return control.value;
            }
        }

        return null;
    }
}