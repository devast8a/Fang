import { Node, Ref, Tag } from '../ast/nodes';
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

        if (visitable instanceof Array) {
            for (const ref of visitable) {
                this.resolve(scope, ref);
            }
            return;
        } else {
            this.resolve(scope, visitable);
        }
    }

    private resolve(scope: Scope, ref: Ref) {
        switch (ref.tag) {
            case Tag.RefId: {
                this.resolveNode(scope, this.ctx.get(ref));
                return ref;
            }
                
            case Tag.RefName: {
                // Perform a lookup
                return ref;
            }

            case Tag.RefFieldName: {
                ref.object = this.resolve(scope, ref.object);
                return ref;
            }
                
            case Tag.RefInfer: {
                return ref;
            }

            default: {
                throw unimplemented(ref as never);
            }
        }
    }

    private resolveREF<T extends Node & { id: number }, K extends keyof T>(scope: Scope, node: T, field: K) {
        const ref = node[field] as any as Ref;

        switch (ref.tag) {
            case Tag.RefId: {
                this.resolveNode(scope, this.ctx.get(ref));
                break;
            }
                
            case Tag.RefName: {
                // Perform a lookup
                const result = scope.lookup(ref.target);

                if (result === null) {
                    this.lookups.push({
                        field: field,
                        symbol: ref.target,
                        node: node,
                        scope: scope,
                    });
                    return ref;
                }

                node[field] = result as any;
                break;
            }

            case Tag.RefFieldName: {
                ref.object = this.resolve(scope, ref.object);
                if (typeof ref.target === 'object') {
                    (ref as any).target = this.resolve(scope, ref.target);
                }
                break;
            }
                
            case Tag.RefInfer: {
                break;
            }

            default: {
                throw unimplemented(ref as never);
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
                this.resolveREF(scope, node, 'target');
                this.visit(scope, node.args);
                break;
            }

            case Tag.Constant: {
                break;
            }

            case Tag.Construct: {
                this.resolveREF(scope, node, 'target');
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
                this.visit(inner, node.returnType);
                this.visit(inner, node.body);
                break;
            }

            case Tag.Get: {
                this.resolveREF(scope, node, 'source');
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
                this.resolveREF(scope, node, 'target');
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
                this.visit(scope, node.type);
                this.define(scope, node.name, node);
                break;
            }

            case Tag.While: {
                this.visit(scope, node.condition);
                this.visit(scope, node.body);
                break;
            }
            
            // Refs
            case Tag.RefFieldName: {
                this.visit(scope, node.object);
                break;
            }

            case Tag.RefGlobal:
            case Tag.RefId:
            case Tag.RefIds:
            case Tag.RefInfer:
            case Tag.RefName:
            case Tag.RefUpvalue:
                break;

            default: {
                throw unreachable(node);
            }
        }
    }

    public define(scope: Scope, name: string, node: Node & { id: number }) {
        scope.declare(name, node.id);
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
