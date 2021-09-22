import { Node, Tag, DeclFunction, TypeRefName, Context, RootId } from '../nodes';
import * as Nodes from '../nodes';
import { Scope } from './Scope';

class State {
    scopeMap = new Map<Node, Scope>();
    functions = new Array<DeclFunction>();
    functionId = new Array<number>();

    public constructor(
        public context: Context,
    ) {}
}

export function nameResolution(nodes: Node[], scope: Scope, context: Context) {
    const state = new State(context);

    declareNodes(nodes, scope, state);
    resolveNodes(nodes, state);
}

function declareNodes(nodes: Node[], scope: Scope, state: State) {
    for (const node of nodes) {
        declareNode(node, scope, state);
    }
}

function declareNode(node: Node, scope: Scope, state: State) {
    state.scopeMap.set(node, scope);

    switch (node.tag) {
        case Tag.DeclModule: {
            return;
        }

        case Tag.DeclSymbol: {
            return;
        }

        case Tag.DeclStruct: {
            scope.declare(node.name, RootId, node.id);
            declareNodes(Array.from(node.superTypes), scope, state);

            return;
        }

        case Tag.DeclFunction: {
            state.functions.push(node);
            state.functionId.push(node.id);

            scope.declare(node.name, RootId, node.id);

            const inner = scope.newChildScope();
            declareNodes(node.parameters, inner, state);
            declareNode(node.returnType, inner, state);
            declareNodes(node.body, inner, state);

            state.functions.pop();
            state.functionId.pop();
            return;
        }

        case Tag.DeclTrait: {
            scope.declare(node.name, RootId, node.id);

            // TODO: Support members
            return;
        }

        case Tag.DeclVariable: {
            // TODO: Support global variables
            // TODO: This can be replaced with a field (we flatten decls in ast generation)
            const currentFunction = state.functions[state.functions.length - 1];

            // TODO: Move this into AstGenerationStage
            // Register variable into function
            node.id = currentFunction.variables.length;
            currentFunction.variables.push(node);

            declareNode(node.type, scope, state);
            if (node.value !== null) { declareNode(node.value, scope, state); }

            // Declare variable name
            scope.declare(node.name, currentFunction.id, node.id);

            return;
        }

        case Tag.ExprCall: {
            declareNode(node.target, scope, state);
            declareNodes(node.args, scope, state);
            return;
        }

        case Tag.ExprCallStatic: {
            declareNodes(node.args, scope, state);
            return;
        }

        case Tag.ExprConstruct: {
            declareNodes(node.args, scope, state);
            return;
        }

        case Tag.ExprConstant: {
            return;
        }

        case Tag.ExprDeclaration: {
            // TODO: Support other declaration types
            // We don't know if we have a local (and should lookup the declaration in parent.variables) or
            //  if we have something else (and should lookup the declaration in module.nodes)
            const parent = state.functions[state.functions.length - 1];
            const variable = parent.variables[node.id];

            scope.declare(variable.name, parent.id, node.id);
            if (variable.value !== null) {
                declareNode(variable.value, scope, state);
            }
            return;
        }

        case Tag.ExprGetField: {
            declareNode(node.object, scope, state);
            return;
        }

        case Tag.ExprGetLocal: {
            return;
        }

        case Tag.ExprMacroCall: {
            return;
        }

        case Tag.ExprRefName: {
            // References never declare anything
            return;
        }

        case Tag.ExprSetField: {
            declareNode(node.object, scope, state);
            declareNode(node.value, scope, state);
            return;
        }

        case Tag.ExprSetLocal: {
            declareNode(node.value, scope, state);
            return;
        }

        case Tag.ExprDestroyLocal: {
            return;
        }

        case Tag.ExprIf: {
            declareNodes(node.branches, scope, state);

            const inner = scope.newChildScope();
            declareNodes(node.elseBranch, inner, state);
            return;
        }

        case Tag.ExprIfBranch: {
            const inner = scope.newChildScope();

            declareNode(node.condition, inner, state);
            declareNodes(node.body, inner, state);
            return;
        }

        case Tag.ExprWhile: {
            const inner = scope.newChildScope();

            declareNode(node.condition, inner, state);
            declareNodes(node.body, inner, state);
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

function resolveNodes<T extends Node>(nodes: T[], state: State): T[] {
    return nodes.map(node => resolveNode(node, state));
}

function resolveNode<T extends Node>(_node: T, state: State): T {
    const node  = _node as Node;
    const context = {} as Context;

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
            node.superTypes = new Set(resolveNodes(Array.from(node.superTypes), state));

            return node as T;
        }

        case Tag.DeclFunction: {
            state.functions.push(node);

            node.parameters = resolveNodes(node.parameters, state);
            node.returnType = resolveNode(node.returnType, state);
            node.body       = resolveNodes(node.body, state);

            state.functions.pop();
            return node as T;
        }

        case Tag.DeclTrait: {
            // TODO: Implement
            return node as T;
        }

        case Tag.DeclVariable: {
            if (node.value !== null) {
                node.value = resolveNode(node.value, state);
            }
            node.type = resolveNode(node.type, state);
            
            return node as T;
        }

        case Tag.ExprCall: {
            node.target = resolveNode(node.target, state);
            node.args   = resolveNodes(node.args, state);

            return node as T;
        }

        case Tag.ExprConstruct: {
            // TODO: Error handling
            const ref = scope.lookup((node.target as TypeRefName).name)!;
            node.target = new Nodes.TypeRefStatic(ref.parent, ref.id);
            
            resolveNodes(node.args, state);
            return node as T;
        }

        case Tag.ExprConstant: {
            return node as T;
        }

        case Tag.ExprDeclaration: {
            // TODO: Support other declaration types
            // We don't know if we have a local (and should lookup the declaration in parent.variables) or
            //  if we have something else (and should lookup the declaration in module.nodes)
            const parent = state.functions[state.functions.length - 1];
            const variable = parent.variables[node.id];

            if (variable.value !== null) {
                variable.value = resolveNode(variable.value, state);
            }

            return node as T;
        }

        case Tag.ExprGetField: {
            node.object = resolveNode(node.object, state);
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
            node.object = resolveNode(node.object, state);
            node.value  = resolveNode(node.value, state);

            return node as T;
        }

        case Tag.ExprSetLocal: {
            throw new Error("Not supported");
        }

        case Tag.ExprDestroyLocal: {
            throw new Error("Not supported");
        }

        case Tag.ExprIf: {
            node.branches   = resolveNodes(node.branches, state);
            node.elseBranch = resolveNodes(node.elseBranch, state);
            return node as T;
        }

        case Tag.ExprIfBranch: {
            node.condition = resolveNode(node.condition, state);
            node.body      = resolveNodes(node.body, state);
            return node as T;
        }

        case Tag.ExprWhile: {
            resolveNode(node.condition, state);
            resolveNodes(node.body, state);
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