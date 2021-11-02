import { Context, Node, NodeId, Tag, unreachable } from '../nodes';
import { visit, VisitorControl } from './visitor';

export function VisitType<State>(context: Context, node: Node, id: NodeId, state: State, control: VisitorControl<State>): Node {
    switch (node.tag) {
        // Nodes with a Type field
        case Tag.DeclFunction:  return visit.fieldNode(context, node, id, state, control, 'returnType');
        case Tag.DeclStruct:    return visit.fieldArray(context, node, id, state, control, 'superTypes');
        case Tag.DeclTrait:     return visit.fieldArray(context, node, id, state, control, 'superTypes');
        case Tag.DeclVariable:  return visit.fieldNode(context, node, id, state, control, 'type');
        case Tag.ExprCreate:    return visit.fieldNode(context, node, id, state, control, 'type');
        case Tag.ExprConstant:  return visit.fieldNode(context, node, id, state, control, 'type');

        case Tag.TypeGenericApply: {
            const target = control.first(context, node.target, id, state);
            const args = visit.array(context, node.args, state, control.first);

            if (target !== node.target || args !== node.args) {
                node = Node.mutate(node, { target, args });
            }

            return control.next(context, node, id, state);
        }

        // Nodes without Type field
        case Tag.DeclGenericParameter:
        case Tag.ExprBody:
        case Tag.ExprCall:
        case Tag.ExprDeclaration:
        case Tag.ExprDestroy:
        case Tag.ExprGet:
        case Tag.ExprIf:
        case Tag.ExprIfCase:
        case Tag.ExprMove:
        case Tag.ExprReturn:
        case Tag.ExprSet:
        case Tag.ExprWhile:
        case Tag.Module:
        case Tag.RefFieldId:
        case Tag.RefFieldName:
        case Tag.RefGlobal:
        case Tag.RefGlobalDecl:
        case Tag.RefLocal:
        case Tag.RefName:
        case Tag.TypeGet:
        case Tag.TypeInfer:
        case Tag.NodeFree:
            return control.next(context, node, id, state);
    }

    throw unreachable(node);
}