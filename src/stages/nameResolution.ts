import { Node, Tag, TypeRefName, Context, RootId } from '../nodes';
import * as Nodes from '../nodes';
import { Scope } from './Scope';

class State {
    scopeMap = new Map<Node, Scope>();

    public constructor(
        public context: Context,
    ) {}
}

export function nameResolution(nodes: Node[], scope: Scope, context: Context) {
    const state = new State(context);

    declareNodes(context, nodes, scope, state);
    resolveNodes(context, nodes, state);
}

function declareNodes(context: Context, nodes: Node[], scope: Scope, state: State) {
    for (const node of nodes) {
        declareNode(context, node, scope, state);
    }
}

function declareNode(context: Context, node: Node, scope: Scope, state: State) {
    state.scopeMap.set(node, scope);

    switch (node.tag) {
        case Tag.DeclModule: {
            return;
        }

        case Tag.DeclSymbol: {
            return;
        }

        case Tag.DeclStruct: {
            // Structures are always flattened and stored in the root object.
            scope.declare(node.name, RootId, node.id);

            declareNodes(context, Array.from(node.superTypes), scope, state);

            return;
        }

        case Tag.DeclFunction: {
            // Functions are always flattened and stored in the root object.
            scope.declare(node.name, RootId, node.id);

            const childContext = context.nextId(node.id);
            const inner = scope.newChildScope();

            declareNodes(childContext, node.parameters, inner, state);
            declareNode (childContext, node.returnType, inner, state);
            declareNodes(childContext, node.body, inner, state);

            return;
        }

        case Tag.DeclTrait: {
            scope.declare(node.name, RootId, node.id);

            // TODO: Support members
            return;
        }

        case Tag.DeclVariable: {
            declareNode(context, node.type, scope, state);
            if (node.value !== null) { declareNode(context, node.value, scope, state); }

            // Variables are not flattened, and are stored in the enclosing declaration.
            scope.declare(node.name, context.parentId, node.id);
            return;
        }

        case Tag.ExprCall: {
            declareNode (context, node.target, scope, state);
            declareNodes(context, node.args, scope, state);
            return;
        }

        case Tag.ExprCallStatic: {
            declareNodes(context, node.args, scope, state);
            return;
        }

        case Tag.ExprConstruct: {
            declareNodes(context, node.args, scope, state);
            return;
        }

        case Tag.ExprConstant: {
            return;
        }

        case Tag.ExprDeclaration: {
            const decl = context.resolve(node);
            declareNode(context, decl, scope, state);
            return;
        }

        case Tag.ExprGetField: {
            declareNode(context, node.object, scope, state);
            return;
        }

        case Tag.ExprGetLocal: {
            // Does not declare anything
            return;
        }

        case Tag.ExprMacroCall: {
            // TODO: Needs to be implemented
            return;
        }

        case Tag.ExprRefName: {
            // Does not declare anything
            return;
        }

        case Tag.ExprSetField: {
            declareNode(context, node.object, scope, state);
            declareNode(context, node.value, scope, state);
            return;
        }

        case Tag.ExprSetLocal: {
            declareNode(context, node.value, scope, state);
            return;
        }

        case Tag.ExprDestroyLocal: {
            // Does not declare anything
            return;
        }

        case Tag.ExprIf: {
            declareNodes(context, node.branches, scope, state);

            const inner = scope.newChildScope();
            declareNodes(context, node.elseBranch, inner, state);
            return;
        }

        case Tag.ExprIfBranch: {
            const inner = scope.newChildScope();
            declareNode (context, node.condition, inner, state);
            declareNodes(context, node.body, inner, state);
            return;
        }

        case Tag.ExprWhile: {
            const inner = scope.newChildScope();
            declareNode (context, node.condition, inner, state);
            declareNodes(context, node.body, inner, state);
            return;
        }

        case Tag.TypeInfer: {
            return;
        }

        case Tag.TypeRefName: {
            // References never declare anything
            return;
        }
    }

    throw new Error(`declareNode: No case for node '${Tag[node.tag]}'`);
}

// TODO: Replace resolveNodes with Visitor
function resolveNodes<T extends Node>(context: Context, nodes: T[], state: State): T[] {
    return nodes.map(node => resolveNode(context, node, state));
}

function resolveNode<T extends Node>(context: Context, _node: T, state: State): T {
    const node  = _node as Node;

    const scope = state.scopeMap.get(node);

    if (scope === undefined) {
        throw new Error(`Must call declareNode on node before calling resolveNode`);
    }

    switch (node.tag) {
        case Tag.DeclModule: {
            return node as T;
        }

        case Tag.DeclSymbol: {
            return node as T;
        }

        case Tag.DeclStruct: {
            // TODO: Implement
            node.superTypes = new Set(resolveNodes(context, Array.from(node.superTypes), state));

            return node as T;
        }

        case Tag.DeclFunction: {
            const childContext = context.nextId(node.id);

            node.parameters = resolveNodes(childContext, node.parameters, state);
            node.returnType = resolveNode (childContext, node.returnType, state);
            node.body       = resolveNodes(childContext, node.body, state);

            return node as T;
        }

        case Tag.DeclTrait: {
            // TODO: Implement
            return node as T;
        }

        case Tag.DeclVariable: {
            if (node.value !== null) {
                node.value = resolveNode(context, node.value, state);
            }
            node.type = resolveNode(context, node.type, state);
            
            return node as T;
        }

        case Tag.ExprCall: {
            node.target = resolveNode(context, node.target, state);
            node.args   = resolveNodes(context, node.args, state);

            return node as T;
        }

        case Tag.ExprConstruct: {
            // TODO: Error handling
            const ref = scope.lookup((node.target as TypeRefName).name)!;
            node.target = new Nodes.TypeRefStatic(ref.parent, ref.id);
            
            resolveNodes(context, node.args, state);
            return node as T;
        }

        case Tag.ExprConstant: {
            return node as T;
        }

        case Tag.ExprDeclaration: {
            const decl = context.resolve(node);
            resolveNode(context, decl, state);
            return node as T;
        }

        case Tag.ExprGetField: {
            node.object = resolveNode(context, node.object, state);
            return node as T;
        }

        case Tag.ExprGetLocal: {
            throw new Error("Not supported!");
            // // TODO: Error handling
            // console.log(scope.lookup(node.local as string));
            // node.local = convert(context, scope.lookup(node.local as string), Nodes.DeclVariable).id;
            // return node as T;
        }

        case Tag.ExprRefName: {
            const ref = scope.lookup(node.name)!;
            return new Nodes.ExprRefStatic(ref.parent, ref.id) as T;
        }

        case Tag.ExprSetField: {
            node.object = resolveNode(context, node.object, state);
            node.value  = resolveNode(context, node.value, state);

            return node as T;
        }

        case Tag.ExprSetLocal: {
            throw new Error("Not supported");
        }

        case Tag.ExprDestroyLocal: {
            throw new Error("Not supported");
        }

        case Tag.ExprIf: {
            node.branches   = resolveNodes(context, node.branches, state);
            node.elseBranch = resolveNodes(context, node.elseBranch, state);
            return node as T;
        }

        case Tag.ExprIfBranch: {
            node.condition = resolveNode (context, node.condition, state);
            node.body      = resolveNodes(context, node.body, state);
            return node as T;
        }

        case Tag.ExprWhile: {
            resolveNode (context, node.condition, state);
            resolveNodes(context, node.body, state);
            return node as T;
        }

        case Tag.TypeInfer: {
            return node as T;
        }

        case Tag.TypeRefName: {
            // TODO: Handle errors
            const ref = scope.lookup(node.name)!;
            return new Nodes.TypeRefStatic(ref.parent, ref.id) as T;
        }
    }

    throw new Error(`resolveNode: No case for node '${Tag[node.tag]}'`);
}