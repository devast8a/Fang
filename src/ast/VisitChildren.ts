import { Children, Node, Tag } from '../nodes';
import { visit, VisitorControl } from './visitor';

export function VisitChildren<State>(state: State, node: Node, parent: number, id: number, control: VisitorControl<State>): Node {
    const { first, next } = control;

    switch (node.tag) {
        // Nodes that don't
        case Tag.DeclVariable:
        case Tag.ExprCall:
        case Tag.ExprConstant:
        case Tag.ExprCreate:
        case Tag.ExprDeclaration:
        case Tag.ExprDestroy:
        case Tag.ExprGet:
        case Tag.ExprIf:
        case Tag.ExprIfCase:
        case Tag.ExprReturn:
        case Tag.ExprSet:
        case Tag.ExprWhile:
        case Tag.RefField:
        case Tag.RefGlobal:
        case Tag.RefGlobalMember:
        case Tag.RefLocal:
        case Tag.RefName:
        case Tag.TypeGet:
        case Tag.TypeInfer:
            return next(state, node, parent, id);

        // Nodes that have children
        case Tag.Module:
        case Tag.DeclFunction:
        case Tag.DeclStruct:
        case Tag.DeclTrait: {
            const children = node.children;

            const decl = visit.array(state, children.decl, id, first);
            const expr = visit.array(state, children.expr, id, first);

            if (children.decl !== decl || children.expr !== expr) {
                // TODO: Implement a clone function
                node = Object.assign({}, node, {
                    children: new Children(decl, expr, children.body, children.names)
                });
            }

            return next(state, node, parent, id);
        }
            
    }

    throw new Error(`Unreachable: Unhandled case '${Tag[(node as any)?.tag]}'`);
}