import { Distance, Node, Ref, RefById, Tag } from '../ast/nodes';
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

        if (ref.object === null) {
            // With no context
            switch (ref.tag) {
                case Tag.RefByExpr: {
                    throw new Error('Can not RefByExpr on an empty context.');
                }
                    
                case Tag.RefById: {
                    this.resolveNode(scope, this.ctx.nodes[ref.id]);

                    if (ref.distance === Distance.Local && scope.type === ScopeType.Global) {
                        node[field] = new RefById(ref.object, ref.id, Distance.Global) as any;
                    }
                    return;
                }
                    
                case Tag.RefByIds: {
                    throw unimplemented(ref as never);
                }
                    
                case Tag.RefInfer: {
                    return;
                }
                    
                case Tag.RefByName: {
                    const target = scope.lookup(ref.name);

                    if (target === null) {
                        this.lookups.push({ scope, node, field, symbol: ref.name });
                    } else {
                        node[field] = target as any;
                    }
                    return;
                }
            }
            throw unreachable(ref);
        } else {
            this.resolveNode(scope, this.ctx.get(ref.object));

            switch (ref.tag) {
                case Tag.RefByExpr: {
                    this.resolveNode(scope, this.ctx.get(ref.values[0]));
                    return;
                }
                    
                case Tag.RefById:
                case Tag.RefByIds:
                case Tag.RefInfer:
                case Tag.RefByName:
                    return;
            }
            throw unreachable(ref);
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
                this.resolve(scope, node, 'func');
                this.visit(scope, node.args);
                break;
            }

            case Tag.Constant: {
                break;
            }

            case Tag.Construct: {
                this.resolve(scope, node, 'type');
                this.visit(scope, node.args);
                break;
            }

            case Tag.Continue: {
                break;
            }
                
            case Tag.Destruct: {
                break;
            }

            case Tag.Enum: {
                this.visit(scope, node.body);
                break;
            }

            case Tag.Extend: {
                this.resolve(scope, node, 'target');
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
                
            case Tag.Group: {
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
