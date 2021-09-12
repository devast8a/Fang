import { Node, Tag, Function, Variable, TypeRefName, Type } from '../nodes';
import { Scope } from './Scope';

class State {
    scopeMap = new Map<Node, Scope>();
    functions = new Array<Function>();
}

export function nameResolution(nodes: Node[], scope: Scope) {
    const state = new State();

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
        case Tag.Class: {
            scope.declare(node.name, node);

            return;
        }

        case Tag.Function: {
            state.functions.push(node);

            scope.declare(node.name, node);

            const inner = scope.newChildScope();
            declareNodes(node.parameters, inner, state);
            declareNode(node.returnType, inner, state);
            declareNodes(node.body, inner, state);

            state.functions.pop();
            return;
        }

        case Tag.Trait: {
            scope.declare(node.name, node);

            // TODO: Support members
            return;
        }

        case Tag.Variable: {
            // TODO: Support global variables
            const currentFunction = state.functions[state.functions.length - 1];

            // Register variable into function
            node.id = currentFunction.variables.length;
            currentFunction.variables.push(node);

            declareNode(node.type, scope, state);
            if (node.value !== null) { declareNode(node.value, scope, state); }

            // Declare variable name
            scope.declare(node.name, node);

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

        case Tag.ExprGetLocal: {
            return;
        }

        case Tag.ExprMacroCall: {
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

        case Tag.StmtDelete: {
            return;
        }

        case Tag.StmtIf: {
            declareNodes(node.branches, scope, state);

            const inner = scope.newChildScope();
            declareNodes(node.elseBranch, inner, state);
            return;
        }

        case Tag.StmtIfBranch: {
            const inner = scope.newChildScope();

            declareNode(node.condition, inner, state);
            declareNodes(node.body, inner, state);
            return;
        }

        case Tag.StmtWhile: {
            const inner = scope.newChildScope();

            declareNode(node.condition, inner, state);
            declareNodes(node.body, inner, state);
            return;
        }

        case Tag.TypeInfer: {
            return;
        }

        case Tag.TypeRefName: {
            // TODO: Not sure???
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

    const scope = state.scopeMap.get(node);

    if (scope === undefined) {
        throw new Error(`Must call declareNode on node before calling resolveNode`);
    }

    switch (node.tag) {
        case Tag.Class: {
            // TODO: Implement
            node.superTypes = new Set(resolveNodes(Array.from(node.superTypes), state));

            return node as T;
        }

        case Tag.Function: {
            node.parameters = resolveNodes(node.parameters, state);
            node.returnType = resolveNode(node.returnType, state);
            node.body       = resolveNodes(node.body, state);
            return node as T;
        }

        case Tag.Trait: {
            // TODO: Implement
            return node as T;
        }

        case Tag.Variable: {
            if (node.value !== null) {
                node.value = resolveNode(node.value, state);
            }
            node.type = resolveNode(node.type, state);
            
            return node as T;
        }

        case Tag.ExprCallStatic: {
            // TODO: Implement error handling
            if (node.target.tag === Tag.ExprRefName) {
                const target = scope.lookup(node.target.name);

                if (target !== null && target.tag === Tag.Function) {
                    node.target = target;
                }
            }

            resolveNodes(node.args, state);

            return node as T;
        }

        case Tag.ExprConstruct: {
            // TODO: Error handling
            node.target = scope.lookup((node.target as TypeRefName).name) as Type;
            
            resolveNodes(node.args, state);
            return node as T;
        }

        case Tag.ExprConstant: {
            return node as T;
        }

        case Tag.ExprGetLocal: {
            // TODO: Error handling
            node.local = (scope.lookup(node.local as string) as Variable).id;
            return node as T;
        }

        case Tag.ExprSetField: {
            node.object = resolveNode(node.object, state);
            node.value  = resolveNode(node.value, state);

            return node as T;
        }

        case Tag.ExprSetLocal: {
            // TODO: Error handling
            node.local = (scope.lookup(node.local as string) as Variable).id;
            resolveNode(node.value, state);
            return node as T;
        }

        case Tag.StmtDelete: {
            const target = scope.lookup(node.variable as string);

            if (target === null) {
                throw new Error(node.variable as string);
            }

            node.variable = (scope.lookup(node.variable as string) as Variable).id;
            return node as T;
        }

        case Tag.StmtIf: {
            node.branches   = resolveNodes(node.branches, state);
            node.elseBranch = resolveNodes(node.elseBranch, state);
            return node as T;
        }

        case Tag.StmtIfBranch: {
            node.condition = resolveNode(node.condition, state);
            node.body      = resolveNodes(node.body, state);
            return node as T;
        }

        case Tag.StmtWhile: {
            resolveNode(node.condition, state);
            resolveNodes(node.body, state);
            return node as T;
        }

        case Tag.TypeInfer: {
            return node as T;
        }

        case Tag.TypeRefName: {
            // TODO: Handle errors
            return scope.lookup(node.name) as T;
        }
    }

    throw new Error(`resolveNode: No case for node '${Tag[node.tag]}'`);
}