import { Visitor } from '../ast/visitor';
import { Node, Tag, Type } from '../nodes';
import * as Nodes from '../nodes';

export const resolveNodes = new Visitor({
    after: (node, context) => {
        switch (node.tag) {
            case Tag.ExprCall: {
                const target = node.target;

                switch (target.tag) {
                    // case Tag.ExprRefNode:
                    //      if (target.node.tag !== Tag.SymbolSet) { throw new Error('Not implemented yet'); }
                    //      return new Nodes.ExprCallStatic(target.node, node.args);

                    case Tag.ExprGetField:
                        // Or we could translate this into a flat call?
                        // TODO: Do proper name lookup here
                        return new Nodes.ExprCallField(target.object, target.field as any, node.args);

                    default:
                        throw new Error(`resolveNodes > ExprCall > ${Tag[target.tag]} not supported`);
                }
                break;
            }

            case Tag.ExprGetField: {
                let object = node.object;

                switch (object.tag) {
                    case Tag.ExprRefStatic: {
                        const ref = context.resolve(object.id);
                        if (ref.tag !== Tag.SymbolSet) { throw new Error('Not implemented yet'); }
                        object = new Nodes.ExprGetLocal((ref.nodes[0] as Nodes.DeclVariable).id);
                        break;
                    }

                    default:
                        throw new Error(`resolveNodes > ExprGetField > ${Tag[object.tag]} not supported`);
                }

                // TODO: Sort out types
                const type  = Node.getReturnType(context, object);
                const field = Type.getMember(type, node.field as any);
                return new Nodes.ExprGetField(object, field as any);
            }
        }

        return node;
    }
});