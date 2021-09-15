import { Visitor } from '../ast/visitor';
import { Tag } from '../nodes';
import * as Nodes from '../nodes';

export const resolveNodes = new Visitor({
    after: (node, container) => {
        switch (node.tag) {
            case Tag.ExprCall: {
                const target = node.target;

                if (target.tag !== Tag.ExprRefNode) {
                    break;
                }

                if (target.node.tag !== Tag.SymbolSet) {
                    throw new Error(`Not implemented yet`);
                }

                return new Nodes.ExprCallStatic(target.node, node.args);
            }
        }

        return node;
    }
});