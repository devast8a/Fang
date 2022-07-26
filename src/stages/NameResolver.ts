import { Node, Ref, RefId, RefUpvalue, Tag } from '../ast/nodes';
import { Scope } from "../ast/Scope";
import { Ctx } from '../ast/context';
import { MultiMapUtils, unimplemented, unreachable } from '../utils';

enum Mode {
    DEFAULT,
    MEMBERS,
}

class State {
    public constructor(
        readonly scope: Scope,
        readonly mode: Mode,
    ) { }

    create(mode = this.mode) {
        return new State(this.scope.push(), mode);
    }
}

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

    public visit(state: State, visitable: readonly Ref[] | Ref | null) {
        if (visitable === null) {
            return;
        }

        if (visitable instanceof Array) {
            for (const ref of visitable) {
                this.resolve(state, ref);
            }
            return;
        } else {
            this.resolve(state, visitable);
        }
    }

    private resolve(state: State, ref: Ref) {
        switch (ref.tag) {
            case Tag.RefId: {
                this.resolveNode(state, this.ctx.get(ref));
                return ref;
            }
                
            case Tag.RefName: {
                // Perform a lookup
                return ref;
            }

            case Tag.RefFieldName: {
                ref.object = this.resolve(state, ref.object);
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

    private resolveREF<T extends Node & { id: number }, K extends keyof T>(state: State, node: T, field: K) {
        const ref = node[field] as any as Ref;

        switch (ref.tag) {
            case Tag.RefId: {
                this.resolveNode(state, this.ctx.get(ref));
                break;
            }
                
            case Tag.RefName: {
                // Perform a lookup
                const result = state.scope.lookup(ref.target);

                if (result === null) {
                    this.lookups.push({
                        field: field,
                        symbol: ref.target,
                        node: node,
                        scope: state.scope,
                    });
                    return ref;
                }

                node[field] = result as any;
                break;
            }

            case Tag.RefFieldName: {
                ref.object = this.resolve(state, ref.object);
                if (typeof ref.target === 'object') {
                    (ref as any).target = this.resolve(state, ref.target);
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

    private resolveNode(state: State, node: Node) {
        // console.log(node);
        switch (node.tag) {
            // Expressions
            case Tag.BlockAttribute: {
                // this.visit(scope, node.target);
                break;
            }
                
            case Tag.Break: {
                // target
                this.visit(state, node.value);
                break;
            }

            case Tag.Call: {
                this.resolveREF(state, node, 'target');
                this.visit(state, node.args);
                break;
            }

            case Tag.Constant: {
                break;
            }

            case Tag.Construct: {
                this.resolveREF(state, node, 'target');
                this.visit(state, node.args);
                break;
            }

            case Tag.Continue: {
                this.visit(state, node.value);
                break;
            }
                
            case Tag.Enum: {
                this.visit(state, node.body);
                break;
            }

            case Tag.ForEach: {
                const condition = state.create();
                this.visit(condition, node.collection);
                this.visit(condition, node.element);

                const body = condition.create();
                this.visit(body, node.body);
                break;
            }

            case Tag.Function: {
                if (node.name && state.mode !== Mode.MEMBERS) {
                    this.define(state, node.name, node);
                }

                const inner = state.create();
                this.visit(inner, node.parameters);
                this.visit(inner, node.returnType);
                this.visit(inner, node.body);
                break;
            }

            case Tag.Get: {
                this.resolveREF(state, node, 'source');
                break;
            }

            case Tag.If: {
                for (const c of node.cases) {
                    this.visit(state, c.condition);
                    this.visit(state, c.body);
                }
                break;
            }

            case Tag.Match: {
                this.visit(state, node.value);
                for (const c of node.cases) {
                    this.visit(state, c.value);
                    this.visit(state, c.body);
                }
                break;
            }

            case Tag.Move: {
                this.visit(state, node.value);
                break;
            }

            case Tag.Return: {
                this.visit(state, node.value);
                break;
            }

            case Tag.Set: {
                this.resolveREF(state, node, 'target');
                this.visit(state, node.source);
                break;
            }

            case Tag.Struct: {
                this.define(state, node.name, node);
                const body = state.create(Mode.MEMBERS);
                this.visit(body, node.body);
                break;
            }

            case Tag.Trait: {
                this.define(state, node.name, node);
                const body = state.create(Mode.MEMBERS);
                this.visit(body, node.body);
                break;
            }

            case Tag.Variable: {
                this.visit(state, node.type);
                this.define(state, node.name, node);
                break;
            }

            case Tag.While: {
                this.visit(state, node.condition);
                this.visit(state, node.body);
                break;
            }
            
            // Refs
            case Tag.RefFieldName: {
                this.visit(state, node.object);
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

    public define(state: State, name: string, node: Node & { id: number }) {
        state.scope.declare(name, node.id);
    }
}

export function resolveNames(ctx: Ctx) {
    const resolver = new Resolve(ctx);

    const scope = ctx.builtins.scope.push(true);
    resolver.visit(new State(scope, Mode.DEFAULT), ctx.root);

    for (const entry of resolver.lookups) {
        const result = entry.scope.lookup(entry.symbol);

        if (result === null) {
            continue;
        }

        entry.node[entry.field] = result as any;
    }

    return scope;
}
