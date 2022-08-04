import { Ctx } from '../ast/context';
import { formatNode } from '../ast/formatter';
import { isRef, Node, Ref, Tag } from '../ast/nodes';
import { unimplemented, unreachable } from '../utils';

export class TypeSystemState {
    public readonly types: Array<Node | null>;

    public constructor(
        readonly ctx: Ctx,
    ) {
        this.types = new Array(ctx.nodes.length).fill(null);
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
                    throw unimplemented('RefByExpr');
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
        if (type === null) {
            return null;
        }

        type = isRef(type) ? this.ctx.get(type) : type;
        this.types[expr.id] = type;
        return type;
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

export function processTypes(ctx: Ctx) {
    const types = new TypeSystemState(ctx);

    for (const node of ctx.nodes) {
        switch (node.tag) {
            case Tag.BlockAttribute: {
                // TODO: Implement block attribute
                break;
            }
                
            case Tag.Call: {
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
                break;
            }
                
            case Tag.Get: {
                types.set(node, types.get(node.source));
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

            case Tag.Variable: {
                if (node.type.tag === Tag.RefInfer) {
                    break;
                }

                types.set(node, node.type);
                break;
            }

            default: {
                console.log(Tag[node.tag]);
                break;
            }
        }
    }

    console.group('Types');
    for (const node of ctx.nodes.slice(ctx.builtins.count)) {
        const type = types.types[node.id];

        console.log(formatNode(ctx, node), '::', type === null ? '<unknown type>' : formatNode(ctx, type));
    }
    console.groupEnd();
}