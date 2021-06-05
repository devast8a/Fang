import { Register, Visitor } from '../ast/visitor';
import { builtin } from '../Builtin';
import { RNode, RNodes } from '../nodes/resolved/RNode';
import { RTag } from '../nodes/resolved/RTag';
import { RType } from '../nodes/resolved/RType';
import { Scope } from './Scope';

function setup(
    declare: Register<Declare, RNode, [Scope], void>,
    resolve: Register<Resolve, RNode, [Scope], RNode>
) {
    // DeclClass
    declare(RNodes.DeclClass, (node, declarer, scope) => {
        scope.declare(node.name, node);

        const childScope = scope.newChildScope();
        declarer.declare(node.superTypes, childScope);
        declarer.declare(node.members, childScope);
    });
    resolve(RNodes.DeclClass, (node, resolver, scope) => {
        node.superTypes = resolver.resolve(node.superTypes);
        node.members    = resolver.resolve(node.members);
        return node;
    });

    // DeclFunction
    declare(RNodes.DeclFunction, (node, declarer, scope) => {
        scope.declare(node.name, node);

        const childScope = scope.newChildScope();
        declarer.declare(node.parameters, childScope);
        declarer.declare(node.returnType, childScope);
        declarer.declare(node.body, childScope);
    });
    resolve(RNodes.DeclFunction, (node, resolver, scope) => {
        node.parameters = resolver.resolve(node.parameters);
        node.returnType = resolver.resolve(node.returnType);
        node.body       = resolver.resolve(node.body);
        return node;
    });

    // DeclTrait
    declare(RNodes.DeclTrait, (node, declarer, scope) => {
        scope.declare(node.name, node);

        const childScope = scope.newChildScope();
        declarer.declare(node.superTypes, childScope);
        declarer.declare(node.members, childScope);
    });
    resolve(RNodes.DeclTrait, (node, resolver, scope) => {
        node.superTypes = resolver.resolve(node.superTypes);
        node.members    = resolver.resolve(node.members);
        return node;
    });

    // DeclVariable
    declare(RNodes.DeclVariable, (node, declarer, scope) => {
        scope.declare(node.name, node);

        const childScope = scope.newChildScope();
        declarer.declare(node.type, childScope);
        if (node.value !== null) { declarer.declare(node.value, childScope); }
    });
    resolve(RNodes.DeclVariable, (node, resolver, scope) => {
        node.type = resolver.resolve(node.type);
        return node;
    });

    // ExprCallField
    // ExprCallStatic

    // ExprConstant
    declare(RNodes.ExprConstant, (node, declarer, scope) => {
        // Nothing to declare
    });
    resolve(RNodes.ExprConstant, (node, resolver, scope) => {
        return node;
    });

    // ExprConstruct
    // ExprGetField
    // ExprGetLocal
    // ExprSetField
    // ExprSetLocal
    // RGeneric
    // RGenericApply
    // RGenericParameter

    // RStmtIf
    declare(RNodes.StmtIf, (node, declarer, scope) => {
        const childScope = scope.newChildScope();

        declarer.declare(node.cases, scope);
        declarer.declare(node.final, childScope);
    });
    resolve(RNodes.StmtIf, (node, resolver, scope) => {
        node.cases = resolver.resolve(node.cases);
        node.final = resolver.resolve(node.final);

        return node;
    });

    // RStmtIfCase
    declare(RNodes.StmtIfCase, (node, declarer, scope) => {
        const childScope = scope.newChildScope();

        declarer.declare(node.condition, scope);
        declarer.declare(node.body, childScope);
    });
    resolve(RNodes.StmtIfCase, (node, resolver, scope) => {
        node.condition = resolver.resolve(node.condition);
        node.body      = resolver.resolve(node.body);

        return node;
    });

    // RStmtReturn
    // RStmtWhile

    // RTypeAtom
    declare(RNodes.TypeAtom, (node, declarer, scope) => {
        // Nothing to declare
    });
    resolve(RNodes.TypeAtom, (node, resolver, scope) => {
        // Already resolved
        if (node.type !== null) {
            return node;
        }

        const type = scope.lookup(node.name);

        if (type === null) {
            // TODO: Create a better error system
            throw new Error("Type does not exist");
        }

        // TODO: Check if casting is actually valid
        node.type = type as RType;
        return node;
    });

    // UAtom
    declare(RNodes.UUExprAtom, (node, declarer, scope) => {
        // Nothing to declare
    });
    resolve(RNodes.UUExprAtom, (node, resolver, scope) => {
        // TODO: Support up values
        const variable = scope.lookup(node.name);

        if (variable === null) {
            // TODO: Create a better error system
            throw new Error("Variable does not exist");
        }

        return new RNodes.ExprGetLocal(variable as any);
    });

    // UAssign
    declare(RNodes.UUExprAssign, (node, declarer, scope) => {
        // TODO: Might need to declare?
    });
    resolve(RNodes.UUExprAssign, (node, resolver, scope) => {
        // TODO: Support up values
        const target = node.target;

        switch (target.tag) {
            case RTag.UExprAtom: {
                const variable = scope.lookup(target.name);

                if (variable === null) {
                    // TODO: Create a better error system
                    throw new Error("Variable does not exist");
                }

                const value = resolver.resolve(node.value);

                // TODO: Check casting
                return new RNodes.ExprSetLocal(
                    variable as RNodes.DeclVariable,
                    value as any,
                );
            }
        }

        throw new Error(`Incomplete switch ${RTag[(target as any).tag]}`)
    });

    // UCall
    declare(RNodes.UUExprCall, (node, declarer, scope) => {
        declarer.declare(node.target, scope);
        declarer.declare(node.args, scope);
    });
    resolve(RNodes.UUExprCall, (node, resolver, scope) => {
        const target = node.target;

        switch (target.tag) {
            case RTag.UExprAtom: {
                const fn = scope.lookup(target.name);

                if (fn === null) {
                    // TODO: Create a better error system
                    throw new Error("Function does not exist");
                }

                const args = resolver.resolve(node.args);

                // TODO: Check if casting is valid
                return new RNodes.ExprCallStatic(fn as RNodes.DeclFunction, args as any[]);
            }
        }

        throw new Error(`Incomplete switch ${RTag[(target as any).tag]}`)
    });

    // UExpr
    // UField
}

////////////////////////////////////////////////////////////////////////////////////////////////////

export class NameResolutionStage {
    private declare: Declare;
    private resolve: Resolve;

    public constructor() {
        const scopes = new Map();
        this.declare = new Declare(scopes);
        this.resolve = new Resolve(scopes);
    }

    public execute(nodes: RNode[]) {
        const scope = new Scope();

        scope.declare("S32", builtin.types.s32);
        scope.declare("Str", builtin.types.str);
        scope.declare("Bool", builtin.types.bool);

        this.declare.declare(nodes, scope);
        return this.resolve.resolve(nodes);
    }
}

function ignore() {}

class Declare extends Visitor<RNode, [Scope], void> {
    private scopes: Map<RNode, Scope>;

    public constructor(scopes: Map<RNode, Scope>) {
        super(RTag, (reg) => setup(reg, ignore));

        this.scopes = scopes;
    }

    public declare(nodes: RNode | RNode[], scope: Scope) {
        if (nodes instanceof Array) {
            for (const node of nodes) {
                this.scopes.set(node, scope);
                this.visit(node, scope);
            }
        } else {
            this.scopes.set(nodes, scope);
            this.visit(nodes, scope);
        }
    }
}

class Resolve extends Visitor<RNode, [Scope], RNode> {
    private scopes: Map<RNode, Scope>;

    public constructor(scopes: Map<RNode, Scope>) {
        super(RTag, (reg) => setup(ignore, reg));

        this.scopes = scopes;
    }

    public resolve<T extends RNode>(node: T): T
    public resolve<T extends RNode>(node: T[]): T[]
    public resolve<T extends RNode>(nodes: T | T[]): (T | T[]) {
        if (nodes instanceof Array) {
            const output = [];

            for (const node of nodes) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const scope = this.scopes.get(node)!;
                output.push(this.visit(node, scope));
            }

            return output as T[];
        } else {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const scope = this.scopes.get(nodes)!;
            return this.visit(nodes, scope) as T;
        }
    }
}