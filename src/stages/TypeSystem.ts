import { Ctx } from '../ast/context';
import { formatNode } from '../ast/formatter';
import { Distance, isRef, Node, Ref, RefById, Tag } from '../ast/nodes';
import { unimplemented, unreachable } from '../utils';

export function processTypes(ctx: Ctx) {
    const types = new TypeSystemState(ctx);

    // Hack 'self' to work.
    for (const node of ctx.nodes) {
        if (node.tag !== Tag.Struct) {
            continue;
        }

        for (const memberRef of node.body) {
            const member = ctx.get(memberRef);

            if (member.tag === Tag.Function) {
                for (const parameterRef of member.parameters) {
                    const parameter = ctx.get(parameterRef);

                    if (parameter.name === 'self' && parameter.type.tag === Tag.RefInfer) {
                        parameter.type = new RefById(null, node.id, Distance.Global);
                    }
                }
            }
        }
    }

    for (const node of ctx.nodes) {
        switch (node.tag) {
            case Tag.BlockAttribute: {
                // TODO: Implement block attribute
                break;
            }
                
            case Tag.Call: {
                // FIX UP
                types.typeof(node, 'func');
                types.set(node, ctx.get(node.func).returnType);
                break;
            }
                
            case Tag.Constant: {
                types.set(node, node.type);
                break;
            }
                
            case Tag.Construct: {
                types.set(node, node.type);
                break;
            }

            case Tag.Function: {
                types.set(node, node);

                if (node.returnType.tag === Tag.RefInfer) {
                    node.returnType = ctx.builtins.nothing;

                    if (node.body.length > 0) {
                        const lastNode = ctx.get(node.body[node.body.length - 1]);

                        if (lastNode.tag === Tag.Return) {
                            const type = types.get(lastNode);
                            if (type === null) {
                                //console.log(type);
                                break;
                            }
                            node.returnType = mkRef(type);
                        }
                    }
                }
                break;
            }
                
            case Tag.Get: {
                types.typeof(node, 'source');
                types.set(node, types.get(node.source));
                break;
            }
                
            case Tag.Return: {
                types.set(node, node.value === null ? ctx.builtins.nothing : types.get(node.value));
                break;
            }
                
            case Tag.Set: {
                types.set(node, types.get(node.source));

                const target = ctx.get(node.target);
                if (types.get(target) === null) {
                    types.set(target, types.get(node.source));
                }
                break;
            }

            case Tag.Struct: {
                types.set(node, node);
                break;
            }

            case Tag.Trait: {
                types.set(node, node);
                break;
            }

            case Tag.Variable: {
                if (node.type.tag === Tag.RefInfer) {
                    break;
                }

                types.set(node, node.type);
                break;
            }

            default: {
                //console.log(Tag[node.tag]);
                break;
            }
        }
    }

    // console.group('Types');
    // for (const node of ctx.nodes.slice(ctx.builtins.count)) {
    //     const type = types.types[node.id];

    //     console.log(formatNode(ctx, node), '::', type === null ? '<unknown type>' : formatNode(ctx, type));
    // }
    // console.groupEnd();
}

export class TypeSystemState {
    public readonly types: Array<Node | null>;

    public constructor(
        readonly ctx: Ctx,
    ) {
        this.types = new Array(ctx.nodes.length).fill(null);
    }

    public typeof<T extends Node | Ref, K extends keyof T>(node: T, field: K): Node | null {
        const ref = node[field] as any as Ref;

        switch (ref.tag) {
            case Tag.RefById: {
                return this.types[ref.id];
            }

            case Tag.RefByIds: {
                return this.types[ref.ids[0]];
            }

            case Tag.RefByName: {
                if (ref.object === null) {
                    return null
                }

                const object = this.typeof(ref, 'object');
                if (object === null) {
                    return null;
                }

                if (object.tag !== Tag.Struct && object.tag !== Tag.Trait) {
                    return null;
                }

                for (const memberRef of object.body) {
                    const member = this.ctx.get(memberRef);
                    if ((member as any).name === ref.name) {
                        node[field] = new RefById(ref.object, member.id, Distance.Local) as any;
                    }
                }

                return null;
            }
        }

        return null;
    }

    public get(expr: Node | Ref): Node | null {
        if (isRef(expr)) {
            switch (expr.tag) {
                case Tag.RefById: {
                    return this.types[expr.id];
                }

                case Tag.RefByIds: {
                    return this.types[expr.ids[0]];
                }
                
                case Tag.RefByName: {
                    // Unresolved symbol
                    if (expr.object === null) {
                        return null;
                    }

                    const member = this.member(expr.object, expr.name);
                    if (member === null) {
                        return null;
                    }

                    return this.types[member.id];
                }
                
                case Tag.RefByExpr: {
                    if (expr.object === null) {
                        return null;
                    }

                    // ???
                    return this.ctx.get(this.ctx.builtins.u32);
                }
                
                case Tag.RefInfer: {
                    return null;
                }
            }

            throw unreachable(expr);
        }

        return this.types[expr.id];
    }

    public set(expr: Node, type: Node | Ref | null) {
        if (type === null || !isRef(type)) {
            return this.types[expr.id] = type;
        }

        switch (type.tag) {
            case Tag.RefById: {
                return this.types[expr.id] = this.ctx.nodes[type.id];
            }

            case Tag.RefByIds: {
                return this.types[expr.id] = this.ctx.nodes[type.ids[0]];
            }

            default: {
                return null;
            }
        }

        throw unreachable(type as never);
    }

    public member(expr: Ref, name: string) {
        const struct = this.get(expr);

        if (struct === null) {
            return null;
        }
    
        switch (struct.tag) {
            case Tag.Struct: {
                for (const memberId of struct.body) {
                    const member = this.ctx.get(memberId);

                    if (member.tag === Tag.Variable && member.name === name) {
                        return member;
                    }
                }

                return null;
            }
                
            default: {
                throw unimplemented(struct as any);
            }
        }
    }
}

function mkRef(node: Node) {
    return new RefById(null, node.id, Distance.Global);
}