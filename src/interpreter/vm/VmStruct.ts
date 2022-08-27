import { Struct, Tag } from '../../ast/nodes';
import { assert } from '../../utils';
import { Environment } from '../Environment';
import { evaluate } from '../Interpreter';
import { VmInstance } from './VmInstance';

export class VmStruct {
    private assigned = new Map();

    constructor(
        readonly env: Environment,
        readonly struct: Struct,
    ) {
        for (const ref of this.struct.body) {
            const node = this.env.ctx.get(ref);

            if (node.tag === Tag.Set) {
                assert(node.target.tag === Tag.RefById);
                this.assigned.set(node.target.id, evaluate(this.env, node.source));
            }
        }
    }

    construct(args: any[]) {
        // TODO: Compact identifiers and replace the map with an array.
        const fields = new Map(this.assigned);

        let i = 0;
        for (const ref of this.struct.body) {
            const node = this.env.ctx.get(ref);

            if (node.tag === Tag.Variable) {
                fields.set(node.id, args[i]);
                i++;
            }
        }

        return new VmInstance(fields);
    }
}