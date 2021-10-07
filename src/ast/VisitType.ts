import { Node, Tag } from '../nodes';
import { visit, VisitorControl } from './visitor';

export function VisitType<State>(state: State, node: Node, parent: number, id: number, control: VisitorControl<State>): Node {
    switch (node.tag) {
        // Nodes with a Type field
        case Tag.DeclFunction:  return visit.fieldNode(state, node, parent, id, control, 'returnType');
        case Tag.DeclStruct:    return visit.fieldArray(state, node, parent, id, control, 'superTypes');
        case Tag.DeclTrait:     return visit.fieldArray(state, node, parent, id, control, 'superTypes');
        case Tag.DeclVariable:  return visit.fieldNode(state, node, parent, id, control, 'type');

        // TODO: Waiting for builtin support again
        // case Tag.ExprConstant:  return visit.fieldNode(state, node, parent, id, control, 'type');
        case Tag.ExprConstant: return control.next(state, node, parent, id);

        // Nodes without Type field
        case Tag.ExprCall:
        case Tag.ExprCreate:
        case Tag.ExprDeclaration:
        case Tag.ExprDestroy:
        case Tag.ExprGet:
        case Tag.ExprIf:
        case Tag.ExprIfCase:
        case Tag.ExprReturn:
        case Tag.ExprSet:
        case Tag.ExprWhile:
        case Tag.Module:
        case Tag.RefField:
        case Tag.RefGlobal:
        case Tag.RefGlobalMember:
        case Tag.RefLocal:
        case Tag.RefName:
        case Tag.TypeGet:
        case Tag.TypeInfer:
            return control.next(state, node, parent, id);
    }

    throw new Error(`Unreachable: Unhandled case '${Tag[(node as any)?.tag]}'`);
}