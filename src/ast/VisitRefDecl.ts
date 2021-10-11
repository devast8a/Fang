import { Context, Node, NodeId, Tag } from '../nodes';
import { visit, VisitorControl } from './visitor';

export function VisitRefDecl<State>(context: Context, node: Node, id: NodeId, state: State, control: VisitorControl<State>): Node {
    switch (node.tag) {
        // Nodes with DeclRef member
        case Tag.ExprCall:
        case Tag.ExprDeclaration:
        case Tag.ExprDestroy:
        case Tag.ExprGet:
        case Tag.ExprSet:
        case Tag.TypeGet:
            return visit.fieldNode(context, node, id, state, control, 'target');

        // Nodes without DeclRef member
        case Tag.Module:
        case Tag.DeclFunction:
        case Tag.DeclStruct:
        case Tag.DeclTrait:
        case Tag.DeclVariable:
        case Tag.ExprConstant:
        case Tag.ExprCreate:
        case Tag.ExprIf:
        case Tag.ExprIfCase:
        case Tag.ExprReturn:
        case Tag.ExprWhile:
        case Tag.RefFieldId:
        case Tag.RefFieldName:
        case Tag.RefGlobal:
        case Tag.RefGlobalDecl:
        case Tag.RefLocal:
        case Tag.RefName:
        case Tag.TypeInfer:
            return control.next(context, node, id, state);
    }

    throw new Error(`Unreachable: Unhandled case '${Tag[(node as any)?.tag]}'`);
}