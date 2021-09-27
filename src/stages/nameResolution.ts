import { Node, Tag, Context, RootId, UnresolvedId } from '../nodes';
import * as Nodes from '../nodes';
import { Ref, Scope } from './Scope';
import { createVisitor } from '../ast/visitor';
import { VisitTypes } from "../ast/VisitTypes";
import { VisitChildren } from "../ast/VisitChildren";

class State {
    public readonly parentId: number;
    public readonly currentId: number;

    public constructor(
        public scopeMap: Map<Node, Scope>,
        public scope: Scope,
        public context: Context,
    ) {
        this.parentId = context.parentId;
        this.currentId = context.currentId;
    }

    public lookup(node: Node, name: string): Ref {
        const scope = this.scopeMap.get(node);
        
        if (scope === undefined) {
            throw new Error("Could not find scope for current node - call declareNode");
        }

        const ref = scope.lookup(name);

        if (ref === null) {
            throw new Error("symbol does not exist");
        }

        return ref;
    }

    public declare(name: string, parent: number, id: number) {
        this.scope.declare(name, parent, id);
    }

    public createChildState() {
        return new State(
            this.scopeMap,
            this.scope.newChildScope(),
            this.context.nextId2(this.context.currentId, UnresolvedId),
        );
    }

    public changeCurrentId(id: number) {
        return new State(
            this.scopeMap,
            this.scope,
            this.context.nextId2(this.context.parentId, id),
        );
    }

    // Avoid the verbose signature of Context.resolve
    public resolve: typeof Context.prototype.resolve = (ref, type) =>
        this.context.resolve(ref, type);
}

export function nameResolution(context: Context, scope: Scope) {
    const state = new State(
        new Map(),
        scope,
        context,
    );

    declareNode(state, context.module);
    resolve(context.module, context, state);
}

function declareNodes(context: State, nodes: Node[]) {
    for (const node of nodes) {
        declareNode(context, node);
    }
}

function declareNode(state: State, node: Node) {
    state.scopeMap.set(node, state.scope);

    switch (node.tag) {
        case Tag.Module: {
            const nodes = node.nodes;

            for (let id = 0; id < nodes.length; id++) {
                const decl = nodes[id];
                
                if (decl.parent === RootId) {
                    declareNode(state.changeCurrentId(id), decl);
                }
            }
            return;
        }

        case Tag.DeclFunction: {
            // Functions are always flattened and stored in the root object.
            state.declare(node.name, RootId, state.currentId);
            const childState = state.createChildState();

            for (let id = 0; id < node.parameters.length; id++) {
                declareNode(childState.changeCurrentId(id), node.parameters[id]);
            }
            declareNode (childState, node.returnType);
            declareNodes(childState, node.body);

            return;
        }

        case Tag.DeclImport: {
            // TODO: Revisit this
            return;
        }

        case Tag.DeclSymbol: {
            return;
        }

        case Tag.DeclStruct: {
            // Structures are always flattened and stored in the root object.
            state.declare(node.name, RootId, state.currentId);

            declareNodes(state, Array.from(node.superTypes));

            return;
        }

        case Tag.DeclTrait: {
            state.declare(node.name, RootId, state.currentId);

            // TODO: Support members
            return;
        }

        case Tag.DeclVariable: {
            declareNode(state, node.type);
            if (node.value !== null) { declareNode(state, node.value); }

            // Variables are not flattened, and are stored in the enclosing declaration.
            state.declare(node.name, state.parentId, state.currentId);
            return;
        }

        case Tag.ExprCall: {
            declareNode (state, node.target);
            declareNodes(state, node.args);
            return;
        }

        case Tag.ExprCallStatic: {
            declareNodes(state, node.args);
            return;
        }

        case Tag.ExprConstruct: {
            declareNode (state, node.target);
            declareNodes(state, node.args);
            return;
        }

        case Tag.ExprConstant: {
            return;
        }

        case Tag.ExprDeclaration: {
            const decl = state.resolve(node);
            declareNode(state.changeCurrentId(node.member), decl);

            return;
        }

        case Tag.ExprGetField: {
            declareNode(state, node.object);
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
            declareNode(state, node.object);
            declareNode(state, node.value);
            return;
        }

        case Tag.ExprSetLocal: {
            declareNode(state, node.value);
            return;
        }

        case Tag.ExprDestroyLocal: {
            // Does not declare anything
            return;
        }

        case Tag.ExprIf: {
            declareNodes(state, node.branches);

            const childState = state.createChildState();
            declareNodes(childState, node.elseBranch);
            return;
        }

        case Tag.ExprIfBranch: {
            const childState = state.createChildState();
            declareNode (childState, node.condition);
            declareNodes(childState, node.body);
            return;
        }

        case Tag.ExprReturn: {
            if (node.expression !== null) { declareNode(state, node.expression); }
            return;
        }

        case Tag.ExprWhile: {
            const childState = state.createChildState();
            declareNode (childState, node.condition);
            declareNodes(childState, node.body);
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