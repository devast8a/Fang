import { Context, Node, NodeId, Tag } from '../nodes';
import { visit, VisitorControl } from './visitor';

export function VisitType<State>(context: Context, node: Node, id: NodeId, state: State, control: VisitorControl<State>): Node {
    switch (node.tag) {
        // Nodes with a Type field
        case Tag.DeclFunction:  return visit.fieldNode(context, node, id, state, control, 'returnType');
        case Tag.DeclStruct:    return visit.fieldArray(context, node, id, state, control, 'superTypes');
        case Tag.DeclTrait:     return visit.fieldArray(context, node, id, state, control, 'superTypes');
        case Tag.DeclVariable:  return visit.fieldNode(context, node, id, state, control, 'type');
        case Tag.ExprCreate:    return visit.fieldNode(context, node, id, state, control, 'type');

        // TODO: Waiting for builtin support again
        // case Tag.ExprConstant:  return visit.fieldNode(state, node, parent, id, control, 'type');
        case Tag.ExprConstant: return control.next(context, node, id, state);

        // Nodes without Type field
        case Tag.ExprCall:
        case Tag.ExprDeclaration:
        case Tag.ExprDestroy:
        case Tag.ExprGet:
        case Tag.ExprIf:
        case Tag.ExprIfCase:
        case Tag.ExprReturn:
        case Tag.ExprSet:
        case Tag.ExprWhile:
        case Tag.Module:
        case Tag.RefFieldId:
        case Tag.RefFieldName:
        case Tag.RefGlobal:
        case Tag.RefGlobalMember:
        case Tag.RefLocal:
        case Tag.RefName:
        case Tag.TypeGet:
        case Tag.TypeInfer:
            return control.next(context, node, id, state);
    }

    throw new Error(`Unreachable: Unhandled case '${Tag[(node as any)?.tag]}'`);
}