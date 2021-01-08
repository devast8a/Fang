import { Register, Visitor } from '../ast/visitor';
import { Compiler } from '../compile';
import { RNode, RNodes } from '../nodes/resolved/RNode';
import { RType } from '../nodes/resolved/RType';
import { UNode, UNodes } from '../nodes/unresolved/UNode';
import { UTag } from '../nodes/unresolved/UTag';
import { UType } from '../nodes/unresolved/UType';

class Scope {
    private map = new Map<string, RNode>();
    private parent: Scope | null;

    public constructor(parent: Scope | null = null) {
        this.parent = parent;
    }

    public declare(name: string, node: RNode) {
        this.map.set(name, node);
    }

    public lookup(name: string): RNode | null {
        const symbol = this.map.get(name);
        
        if (symbol !== undefined) {
            return symbol;
        }

        if (this.parent !== null) {
            return this.parent.lookup(name);
        }

        return null;
    }

    public createScope(): Scope {
        return new Scope(this);
    }
}

const UNRESOLVED = undefined as any;

export class NameResolutionStage extends Visitor<UNode, [Scope], RNode> {
    public constructor() {
        super(UTag, NameResolutionStage.setup);
    }

    public execute(compiler: Compiler, nodes: UNode[]) {
        const scope = new Scope();
        const global = [];

        for (const node of nodes) {
            global.push(this.declare(node, scope));
        }

        for (const resolver of this.resolvers) {
            resolver();
        }

        return global;
    }

    private resolvers = new Array<() => void>();

    private declare(node: UType, scope: Scope): RType
    private declare(node: UNode, scope: Scope): RNode
    private declare(node: UNode, scope: Scope): RNode {
        return this.visit(node, scope);
    }
    
    private static setup(reg: Register<NameResolutionStage, UNode, [Scope], RNode>) {
        // Handlers
        ////////////////////////////////////////////////////////////
        reg(UNodes.DeclClass, (node, visitor, scope) => {
            const thing = new RNodes.DeclClass(node.name);
            scope.declare(node.name, thing);

            for (const superType of node.superTypes) {
                thing.superTypes.push(visitor.declare(superType, scope));
            }

            return thing;
        });

        reg(UNodes.DeclFunction, (node, visitor, scope) => {
            const thing = new RNodes.DeclFunction(node.name, UNRESOLVED, []);
            scope.declare(node.name, thing);

            // TODO: Avoid subverting readonly with cast to any
            if (node.returnType !== null) {
                (thing as any).returnType = visitor.declare(node.returnType, scope);
            }

            for (const parameter of node.parameters) {
                (thing.parameters as any).push(visitor.declare(parameter, scope));
            }

            // Body
            const childScope = scope.createScope();
            for (const child of node.body) {
                (thing.body as any).push(visitor.declare(child, childScope));
            }

            return thing;
        });

        reg(UNodes.DeclTrait, (node, visitor, scope) => {
            const thing = new RNodes.DeclTrait(node.name);
            scope.declare(node.name, thing);

            for (const superType of node.superTypes) {
                thing.superTypes.push(visitor.declare(superType, scope));
            }

            return thing;
        });

        reg(UNodes.DeclVariable, (node, visitor, scope) => {
            const thing = new RNodes.DeclVariable(node.flags, node.name, node.compileTime, null, null);
            scope.declare(node.name, thing);

            // TODO: Avoid subverting readonly with cast to any
            if (node.type !== null) {
                (thing as any).type = visitor.declare(node.type, scope);
            }

            return thing;
        });

        reg(UNodes.ExprCall, (node, visitor, scope) => {
            const thing = new RNodes.ExprCallStatic(UNRESOLVED, []);
            
            for (const arg of node.args) {
                (thing.args as any).push(visitor.declare(arg, scope));
            }

            visitor.resolvers.push(() => {
                (thing as any).target = scope.lookup("test");
            });

            return thing;
        });

        reg(UNodes.ExprGet, (node, visitor, scope) => {
            const thing = new RNodes.ExprGetLocal(UNRESOLVED);

            visitor.resolvers.push(() => {
                // TODO: Avoid subverting readonly with cast to any
                (thing as any).local = scope.lookup(node.name);
            });

            return thing;
        });

        reg(UNodes.TypeAtom, (node, visitor, scope) => {
            const thing = new RNodes.TypeAtom(node.value, UNRESOLVED);

            visitor.resolvers.push(() => {
                thing.type = scope.lookup(node.value) as RType;
            });

            return thing;
        });
    }
}