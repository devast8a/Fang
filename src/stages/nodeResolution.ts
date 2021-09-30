import { VisitChildren } from '../ast/VisitChildren';
import { createVisitor } from '../ast/visitor';
import * as Nodes from '../nodes';
import { Tag } from '../nodes';

export const resolveNodes = createVisitor(VisitChildren, (node, context) => {
    switch (node.tag) {
        case Tag.ExprCall: {
            const target = node.target;

            switch (target.tag) {
                case Tag.ExprGetLocal:
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

        case Tag.ExprRefStatic: {
            // TODO: Fix references - ExprRefStatic assumes everything refers to a local that this fixes
            return new Nodes.ExprGetLocal(node.member);
        }
    }

    return node;
});