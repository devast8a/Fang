import { Struct, Tag } from '../../ast/nodes';
import { Environment } from '../Environment';
import { VmInstance } from './VmInstance';

export class VmStruct {
    constructor(
        readonly env: Environment,
        readonly struct: Struct,
    ) {}

    construct(args: any[]) {
        // TODO: Compact identifiers and replace the map with an array.
        const fields = new Map();

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