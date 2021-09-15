import { Visitor } from '../ast/visitor';
import { Tag } from '../nodes';
import * as Nodes from '../nodes';

export const resolveNodes = new Visitor({
    after: (node, container) => {
        switch (node.tag) {
            case Tag.ExprCall: {
                const target = node.target;

                switch (target.tag) {
                    case Tag.Function:  // Already fully resolved
                    case Tag.SymbolSet: // Resolved during Overload Resolution
                        break;

                    case Tag.ExprRefNode:
                        if (target.node.tag !== Tag.SymbolSet) { throw new Error('Not implemented yet'); }
                        return new Nodes.ExprCallStatic(target.node, node.args);

                    case Tag.ExprGetField:
                        // Or we could translate this into a flat call?
                        // TODO: Do proper name lookup here
                        return new Nodes.ExprCallField(target.object, target.field as any, node.args);

                    default:
                        throw new Error(`resolveNodes > ExprCall > ${Tag[target.tag]} not supported`);
                }
            }
        }

        return node;
    }
});