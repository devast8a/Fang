import { Distance, Node, Ref, Tag } from '../ast/nodes';
import { Scope, ScopeType } from "../ast/Scope";
import { Ctx } from '../ast/context';
import { unimplemented, unreachable } from '../utils';

interface Lookup {
    scope: Scope;
    symbol: string;

    node: any;
    field: any;
}

export class Resolve {
    constructor(
        readonly ctx: Ctx
    ) { }

    public lookups = new Array<Lookup>();

    public visit(scope: Scope, visitable: readonly Ref[] | Ref | null) {
        if (visitable === null) {
            return;
        }

        // Errors about ref not having an id indicate that .resolve should have been used rather than .visit
        if (visitable instanceof Array) {
            for (const ref of visitable) {
                this.resolveNode(scope, this.ctx.get(ref));
            }
            return;
        }

        this.resolveNode(scope, this.ctx.get(visitable));
    }

    private resolve<T extends Node & { id: number }, K extends keyof T>(scope: Scope, node: T, field: K) {
        const ref = node[field] as any as Ref;

        switch (typeof ref.target) {
            case 'string': {
                if (ref.object !== null) {
                    this.resolveNode(scope, this.ctx.get(ref.object));
                    return;
                }

                const target = scope.lookup(ref.target);

                if (target === null) {
                    this.lookups.push({ scope, node, field, symbol: ref.target });
                } else {
                    node[field] = target as any;
                }
                return;
            }
                
            case 'number': {
                if (ref.object !== null) {
                    this.resolveNode(scope, this.ctx.get(ref.object));
                    return;
                }

                this.resolveNode(scope, this.ctx.get(ref));

                if (ref.distance === Distance.Local && scope.type === ScopeType.Global) {
                    node[field] = new Ref(ref.object, ref.target, Distance.Global) as any;
                }
                return;
            }
                
            case 'object': {
                if (ref.object !== null) {
                    this.resolveNode(scope, this.ctx.get(ref.object));
                }

                const target = ref.target as Ref | null;
                if (target !== null) {
                    this.resolveNode(scope, this.ctx.get(target));
                }
                return;
            }
                
            default: {
                throw unimplemented('Unhandled ref type');
            }
        }
    }

    private resolveNode(scope: Scope, node: Node) {
        // console.log(node);
        switch (node.tag) {
            // Expressions
            case Tag.BlockAttribute: {
                // this.visit(scope, node.target);
                break;
            }
                
            case Tag.Break: {
                // target
                this.visit(scope, node.value);
                break;
            }

            case Tag.Call: {
                this.resolve(scope, node, 'target');
                this.visit(scope, node.args);
                break;
            }

            case Tag.Constant: {
                break;
            }

            case Tag.Construct: {
                this.resolve(scope, node, 'target');
                this.visit(scope, node.args);
                break;
            }

            case Tag.Continue: {
                this.visit(scope, node.value);
                break;
            }
                
            case Tag.Enum: {
                this.visit(scope, node.body);
                break;
            }

            case Tag.ForEach: {
                const condition = scope.push(ScopeType.Inner);
                this.visit(condition, node.collection);
                this.visit(condition, node.element);

                const body = condition.push(ScopeType.Inner);
                this.visit(body, node.body);
                break;
            }

            case Tag.Function: {
                if (node.name && scope.type !== ScopeType.StructTrait) {
                    this.define(scope, node.name, node);
                }

                const inner = scope.push(ScopeType.Function);
                this.visit(inner, node.parameters);
                this.resolve(scope, node, 'returnType');
                this.visit(inner, node.body);
                break;
            }

            case Tag.Get: {
                this.resolve(scope, node, 'source');
                break;
            }

            case Tag.If: {
                for (const c of node.cases) {
                    this.visit(scope, c.condition);
                    this.visit(scope, c.body);
                }
                break;
            }

            case Tag.Match: {
                this.visit(scope, node.value);
                for (const c of node.cases) {
                    this.visit(scope, c.value);
                    this.visit(scope, c.body);
                }
                break;
            }

            case Tag.Move: {
                this.visit(scope, node.value);
                break;
            }

            case Tag.Return: {
                this.visit(scope, node.value);
                break;
            }

            case Tag.Set: {
                this.resolve(scope, node, 'target');
                this.visit(scope, node.source);
                break;
            }

            case Tag.Struct: {
                this.define(scope, node.name, node);
                const body = scope.push(ScopeType.StructTrait);
                this.visit(body, node.body);
                break;
            }

            case Tag.Trait: {
                this.define(scope, node.name, node);
                const body = scope.push(ScopeType.StructTrait);
                this.visit(body, node.body);
                break;
            }

            case Tag.Variable: {
                this.resolve(scope, node, 'type');
                this.define(scope, node.name, node);

                if (this.ctx.LOG) {
                    console.log(scope);
                }
                break;
            }

            case Tag.While: {
                this.visit(scope, node.condition);
                this.visit(scope, node.body);
                break;
            }

            default: {
                throw unreachable(node);
            }
        }
    }

    public define(scope: Scope, name: string, node: Node & { id: number }) {
        scope.declare(name, node.id, node.tag !== Tag.Variable);
    }
}

export function resolveNames(ctx: Ctx) {
    const resolver = new Resolve(ctx);

    const scope = ctx.builtins.scope.push(ScopeType.Global);
    resolver.visit(scope, ctx.root);

    for (const entry of resolver.lookups) {
        const result = entry.scope.lookup(entry.symbol);

        if (result === null) {
            continue;
        }

        entry.node[entry.field] = result as any;
    }

    return scope;
}
