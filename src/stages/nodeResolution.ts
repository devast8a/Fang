import { Visitor } from '../ast/visitor';
import { Expr, Tag, Type } from '../nodes';
import * as Nodes from '../nodes';

export const resolveNodes = new Visitor({
    after: (node, context) => {
        switch (node.tag) {
            case Tag.ExprCall: {
                const target = node.target;

                switch (target.tag) {
                    case Tag.ExprGetLocal:
                        // TODO: Fix references - ExprRefStatic assumes everything refers to a local that this fixes
                        return new Nodes.ExprCallStatic(target.local, node.args);

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
                        const ref = context.resolve2(object);
                        if (ref.tag !== Tag.DeclSymbol) { throw new Error('Not implemented yet'); }

                        // TODO: Check that this is actually a local
                        const id = context.resolve(ref.nodes[0]).id;
                        object = new Nodes.ExprGetLocal(id);
                        break;
                    }

                    default:
                        throw new Error(`resolveNodes > ExprGetField > ${Tag[object.tag]} not supported`);
                }

                // TODO: Sort out types
                const type  = Expr.getReturnType(context, object);
                const field = Type.getMember(type, node.field as any);
                return new Nodes.ExprGetField(object, field as any);
            }

            case Tag.ExprRefStatic: {
                // TODO: Fix references - ExprRefStatic assumes everything refers to a local that this fixes
                return new Nodes.ExprGetLocal(node.member);
            }
        }

        return node;
    }
});