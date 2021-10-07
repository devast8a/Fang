import { Node, Tag } from '../nodes';
import { visit, VisitorControl } from './visitor';

export function VisitRefDecl<State>(state: State, node: Node, parent: number, id: number, control: VisitorControl<State>): Node {
    switch (node.tag) {
        // Nodes with DeclRef member
        case Tag.ExprCall:
        case Tag.ExprDeclaration:
        case Tag.ExprDestroy:
        case Tag.ExprGet:
        case Tag.ExprSet:
        case Tag.TypeGet:
            return visit.fieldNode(state, node, parent, id, control, 'target');

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
        case Tag.RefField:
        case Tag.RefGlobal:
        case Tag.RefGlobalMember:
        case Tag.RefLocal:
        case Tag.RefName:
        case Tag.TypeInfer:
            return control.next(state, node, parent, id);
    }

    throw new Error(`Unreachable: Unhandled case '${Tag[(node as any)?.tag]}'`);
}