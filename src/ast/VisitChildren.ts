import { Node, Tag } from '../nodes';
import { VisitorControl } from './visitor';

export function VisitChildren<State>(state: State, node: Node, parent: number, id: number, control: VisitorControl<State>): Node {
    const { first, next } = control;

    switch (node.tag) {
        // Nodes that have children
        case Tag.Module:
        case Tag.DeclFunction:
        case Tag.DeclStruct:
        case Tag.DeclTrait: {
            // TODO: Capture results
            const decls = node.children.decl;
            for (let child = 0; child < decls.length; child++) {
                first(state, decls[child], id, child);
            }

            const exprs = node.children.expr;
            for (let child = 0; child < exprs.length; child++) {
                first(state, exprs[child], id, child);
            }

            return next(state, node, parent, id);
        }
            
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
        case Tag.TypeInfer: {
            return next(state, node, parent, id);
        }
    }

    throw new Error(`Unreachable: Unhandled case '${Tag[(node as any)?.tag]}'`);
}