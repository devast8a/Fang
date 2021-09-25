import { Node, Tag, Context, RootId } from '../nodes';
import * as Nodes from '../nodes';
import { Ref, Scope } from './Scope';
import { createVisitor } from '../ast/visitor';
import { VisitTypes } from "../ast/VisitTypes";
import { VisitChildren } from "../ast/VisitChildren";

class State {
    scopeMap = new Map<Node, Scope>();

    public lookup(node: Node, name: string): Ref {
        const scope = this.scopeMap.get(node);
        
        if (scope === undefined) {
            throw new Error("scope is not defined for an object");
        }

        const ref = scope.lookup(name);

        if (ref === null) {
            throw new Error("symbol does not exist");
        }

        return ref;
    }
}

export function nameResolution(nodes: Node[], scope: Scope, context: Context) {
    const state = new State();

    declareNodes(context, nodes, scope, state);
    resolve(context.module, context, state);
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
            declareNode (context, node.target, scope, state);
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

const resolve = createVisitor<State>(VisitChildren, VisitTypes, (node, context, state) => {
    switch (node.tag) {
        case Tag.DeclFunction: {
            node.returnType = resolve(node.returnType, context, state);
            return node;
        }

        case Tag.DeclVariable: {
            node.type       = resolve(node.type, context, state);
            return node;
        }

        case Tag.ExprConstruct: {
            node.target     = resolve(node.target, context, state);
            return node;
        }

        case Tag.ExprRefName: {
            const ref = state.lookup(node, node.name);
            return new Nodes.ExprRefStatic(ref.declaration, ref.member);
        }

        case Tag.TypeRefName: {
            const ref = state.lookup(node, node.name);
            return new Nodes.TypeRefStatic(ref.declaration, ref.member);
        }
    }

    return node;
});