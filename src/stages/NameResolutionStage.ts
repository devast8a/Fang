import { Register, Visitor } from '../ast/visitor';
import { Compiler } from '../compile';
import { RNode, RNodes } from '../nodes/resolved/RNode';
import { RTag } from '../nodes/resolved/RTag';
import { RType } from '../nodes/resolved/RType';
import { Scope } from './Scope';

export class NameResolutionStage extends Visitor<RNode, [Scope], void> {
    public constructor() {
        super(RTag, setup);
    }

    public execute(compiler: Compiler, nodes: RNode[]) {
        const scope = new Scope();

        for (const node of nodes) {
            this.declare(node, scope);
        }

        for (const resolver of this.resolvers) {
            resolver();
        }
        this.resolvers.length = 0;

        return nodes;
    }

    private resolvers = new Array<() => void>();

    public addResolver(resolve: () => void) {
        this.resolvers.push(resolve);
    }

    public declare(node: RNode, scope: Scope) {
        return this.visit(node, scope);
    }
}

function setup(reg: Register<NameResolutionStage, RNode, [Scope], void>) {
    // Handlers
    ////////////////////////////////////////////////////////////
    reg(RNodes.DeclClass, (node, visitor, scope) => {
        scope.declare(node.name, node);

        for (const superType of node.superTypes) {
            visitor.declare(superType, scope);
        }

        const childScope = scope.newChildScope();
        for (const member of node.members) {
            visitor.declare(member, childScope);
        }
    });

    reg(RNodes.DeclFunction, (node, visitor, scope) => {
        scope.declare(node.name, node);

        visitor.declare(node.returnType, scope);

        const childScope = scope.newChildScope();
        for (const parameter of node.parameters) {
            visitor.declare(parameter, childScope);
        }

        for (const child of node.body) {
            visitor.declare(child, scope);
        }
    });

    reg(RNodes.DeclTrait, (node, visitor, scope) => {
        scope.declare(node.name, node);
    });

    reg(RNodes.ExprCallStatic, (node, visitor, scope) => {
        node.target = scope.lookup("test") as any;

        for (const arg of node.args) {
            visitor.declare(arg, scope);
        }
    });

    reg(RNodes.ExprGetLocal, (node, visitor, scope) => {
        node.local = scope.lookup("a") as RNodes.DeclVariable;
    });

    reg(RNodes.DeclVariable, (node, visitor, scope) => {
        scope.declare(node.name, node);

        visitor.declare(node.type, scope);

        if (node.value !== null) {
            visitor.declare(node.value, scope);
        }
    });

    reg(RNodes.TypeAtom, (node, visitor, scope) => {
        visitor.addResolver(() => {
            node.type = scope.lookup(node.value) as RType;
        });
    });
}