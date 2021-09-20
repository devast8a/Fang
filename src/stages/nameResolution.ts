import { NodeType } from '../ast/visitor';
import { Node, Tag, DeclFunction, TypeRefName, Type, SymbolSet } from '../nodes';
import * as Nodes from '../nodes';
import { Scope } from './Scope';

class State {
    scopeMap = new Map<Node, Scope>();
    functions = new Array<DeclFunction>();
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
        case Tag.DeclModule: {
            return;
        }

        case Tag.DeclStruct: {
            scope.declare(node.name, node);
            declareNodes(Array.from(node.superTypes), scope, state);

            return;
        }

        case Tag.DeclFunction: {
            state.functions.push(node);

            scope.declare(node.name, node);

            const inner = scope.newChildScope();
            declareNodes(node.parameters, inner, state);
            declareNode(node.returnType, inner, state);
            declareNodes(node.body, inner, state);

            state.functions.pop();
            return;
        }

        case Tag.DeclTrait: {
            scope.declare(node.name, node);

            // TODO: Support members
            return;
        }

        case Tag.DeclVariable: {
            // TODO: Support global variables
            const currentFunction = state.functions[state.functions.length - 1];

            // TODO: Move this into AstGenerationStage
            // Register variable into function
            node.id = currentFunction.variables.length;
            currentFunction.variables.push(node);

            declareNode(node.type, scope, state);
            if (node.value !== null) { declareNode(node.value, scope, state); }

            // Declare variable name
            scope.declare(node.name, node);

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

function convert<T extends NodeType>(set: SymbolSet | null, type: T): InstanceType<T> {
    if (set === null) {
        throw new Error();
    }

    if (set.nodes.length === 0) {
        throw new Error();
    }

    if (set.nodes[0].tag !== type.tag) {
        throw new Error();
    }

    return set.nodes[0] as InstanceType<T>;
}

function resolveNode<T extends Node>(_node: T, state: State): T {
    const node  = _node as Node;

    const scope = state.scopeMap.get(node);

    if (scope === undefined) {
        throw new Error(`Must call declareNode on node before calling resolveNode`);
    }

    switch (node.tag) {
        case Tag.DeclModule: {
            return node as T;
        }

        case Tag.DeclStruct: {
            // TODO: Implement
            node.superTypes = new Set(resolveNodes(Array.from(node.superTypes), state));

            return node as T;
        }

        case Tag.DeclFunction: {
            node.parameters = resolveNodes(node.parameters, state);
            node.returnType = resolveNode(node.returnType, state);
            node.body       = resolveNodes(node.body, state);
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
            node.target = scope.lookup((node.target as TypeRefName).name)?.nodes[0] as Type;
            
            resolveNodes(node.args, state);
            return node as T;
        }

        case Tag.ExprConstant: {
            return node as T;
        }

        case Tag.ExprGetField: {
            node.object = resolveNode(node.object, state);
            return node as T;
        }

        case Tag.ExprGetLocal: {
            // TODO: Error handling
            console.log(scope.lookup(node.local as string));
            node.local = convert(scope.lookup(node.local as string), Nodes.DeclVariable).id;
            return node as T;
        }

        case Tag.ExprRefName: {
            const id = scope.lookup(node.name)!.id;
            return new Nodes.ExprRefStatic(id) as T;
        }

        case Tag.ExprSetField: {
            node.object = resolveNode(node.object, state);
            node.value  = resolveNode(node.value, state);

            return node as T;
        }

        case Tag.ExprSetLocal: {
            // TODO: Error handling
            node.local = convert(scope.lookup(node.local as string), Nodes.DeclVariable).id;
            resolveNode(node.value, state);
            return node as T;
        }

        case Tag.ExprDestroyLocal: {
            node.local = convert(scope.lookup(node.local as string), Nodes.DeclVariable).id;
            return node as T;
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
            return scope.lookup(node.name)?.nodes[0] as T;
        }
    }

    throw new Error(`resolveNode: No case for node '${Tag[node.tag]}'`);
}