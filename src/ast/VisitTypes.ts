import { Context, Node, Tag } from '../nodes';
import * as Nodes from '../nodes';
import { visit, VisitorControl } from './visitor';

/**
 * Recurses into fields of a node that are of type Type.
 * 
 * @see VisitChildren often combined with this visitor to traverse the whole AST.
 * @see createVisitor for an explanation on how to use this function.
 */
export function VisitTypes<State>(node: Node, context: Context, state: State, control: VisitorControl<State>): Node {
    const {first, next} = control;

    switch (node.tag) {
        case Tag.DeclFunction: {
            const child = context.nextId(context.currentId);

            const returnType = first(node.returnType, child, state);

            if (returnType !== node.returnType) {
                node = new Nodes.DeclFunction(node.parent, node.name, node.parameters, returnType, node.children, node.flags);
            }

            return next(node, context, state);
        }

        case Tag.DeclStruct: {
            const superTypes = visit.array(node.superTypes, context, state, first);

            if (superTypes !== node.superTypes) {
                node = new Nodes.DeclStruct(node.parent, node.name, node.children, node.superTypes);
            }

            return next(node, context, state);
        }

        case Tag.DeclTrait: {
            const superTypes = visit.array(node.superTypes, context, state, first);

            if (superTypes !== node.superTypes) {
                node = new Nodes.DeclTrait(node.parent, node.name, node.children, node.superTypes);
            }

            return next(node, context, state);
        }

        case Tag.DeclVariable: {
            const type = first(node.type, context, state);

            if (type !== node.type) {
                node = new Nodes.DeclVariable(node.parent, node.name, type, node.value, node.flags);
            }

            return next(node, context, state);
        }

        case Tag.ExprConstruct: {
            const target = first(node.target, context, state);

            if (target !== node.target) {
                node = new Nodes.ExprConstruct(node.parent, node.target, node.args);
            }

            return next(node, context, state);
        }

        case Tag.Module:
        case Tag.DeclImport:
        case Tag.ExprNamedArgument:
        case Tag.ExprCall:
        case Tag.ExprCallField:
        case Tag.ExprCallStatic:
        case Tag.ExprConstant:
        case Tag.ExprDeclaration:
        case Tag.ExprDestroyField:
        case Tag.ExprDestroyLocal:
        case Tag.ExprGetField:
        case Tag.ExprGetLocal:
        case Tag.ExprIf:
        case Tag.ExprIfBranch:
        case Tag.ExprMacroCall:
        case Tag.ExprRefName:
        case Tag.ExprRefStatic:
        case Tag.ExprReturn:
        case Tag.ExprSetField:
        case Tag.ExprSetLocal:
        case Tag.ExprWhile:
        case Tag.TypeInfer:
        case Tag.TypeRefDecl:
        case Tag.TypeRefName:
        case Tag.TypeRefStatic:
            return next(node, context, state);
    }

    throw new Error(`VisitType: No implementation for '${Tag[(node as any).tag]}'`);
}
