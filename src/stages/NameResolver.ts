import { Node, Ref, RefId, Scope, Tag, Variable } from '../ast/nodes';
import * as Nodes from '../ast/nodes';
import { Ctx } from '../ast/context';
import { MultiMapUtils, unimplemented } from '../utils';
import { mutate, mutateRef } from '../ast/mutate';

// TODO: Implement poisoning properly
export function resolveNames(ctx: Ctx, refs: RefId[]) {
    const nodes = ctx.nodes;

    for (let id = 0; id < nodes.length; id++) {
        const node = nodes[id];

        const set = (ref: Ref): Ref => {
            switch (ref.tag) {
                case Tag.RefName: {
                    const ids = lookup((node as any).parent, ref.target);

                    if (ids === null) {
                        return ref;
                    }
                    if (ids.length === 1) {
                        return new Nodes.RefId(ids[0]);
                    }
                    return new Nodes.RefIds(ids);
                }
                    
                // case Tag.RefFieldName: {
                //     const object = set(ref.object);
                //     const type = getType(ctx, object);

                //     console.log(type, object);
                //     return mutate(ref, 'object', set);
                // }
                    
                default: return ref;
            }
        }

        nodes[id] = mutateRef(node, set);
    }
}

function lookup(scope: Scope, symbol: string) {
    let current: Scope | null = scope;

    do {
        const ids = current.symbols.get(symbol);

        // Symbol does not exist in current scope, look in parent
        if (ids === undefined) {
            current = current.parent;
            continue;
        }

        // Resolved the symbol, cache it in the starting scope.
        while (scope !== current) {
            MultiMapUtils.pushMulti(scope.symbols, symbol, ids);

            // We will hit current before we hit null
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            scope = scope.parent!;
        }

        return ids;
    } while (current !== null)

    // Symbol does not exist at all.
    return null;
}

function resolve<T extends Node>(ctx: Ctx, ref: Ref<T>): T {
    switch (ref.tag) {
        case Tag.RefId:   return ctx.nodes[ref.target] as T;
        case Tag.RefName: {
            switch (ref.target) {
                case 'false': return new Nodes.Constant(ctx.scope, new RefId(1), false) as T;
                case 'true':  return new Nodes.Constant(ctx.scope, new RefId(1), true) as T;
            }
            throw new Error(`Can not resolve ${ref.target}`);
        }
        default: throw unimplemented(ref as never);
    }
}

function getType(ctx: Ctx, node: Node): Ref {
    switch (node.tag) {
        case Tag.Call:     return resolve(ctx, node.target).returnType;
        case Tag.Constant: return node.type;
        case Tag.Get:      return getType(ctx, resolve(ctx, node.target));
        case Tag.RefId:    return getType(ctx, resolve(ctx, node));
        case Tag.Variable: return node.type;
        default: throw unimplemented(node as never);
    }
}

export function check(ctx: Ctx) {
    const nodes = ctx.nodes;

    for (const node of nodes) {
        switch (node.tag) {
            case Tag.Call: {
                const target = resolve(ctx, node.target);

                if (target === null) {
                    continue;
                }

                const p = target.parameters.map(ref => resolve(ctx, getType(ctx, ref)));
                const a = node.args.map(ref => resolve(ctx, getType(ctx, ref)));

                if (a.length !== p.length) {
                    throw new Error('Called with wrong number of arguments')
                }
                for (let i = 0; i < a.length; i++) {
                    if (!checkType(ctx, a[i], p[i])) {
                        throw new Error('Called with wrong type')
                    }
                }
                break;
            }
                
            case Tag.Set: {
                const left = resolve(ctx, getType(ctx, node.target));
                const right = resolve(ctx, getType(ctx, node.value));

                if (!checkType(ctx, left, right)) {
                    console.log(left, right);
                    throw new Error(`Setting value to wrong type`);
                }
            }
        }
    }
}

function checkType(ctx: Ctx, subtype: Node, supertype: Node) {
    return subtype === supertype;
}

export function infer(ctx: Ctx) {
    const nodes = ctx.nodes;

    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        switch (node.tag) {
            case Tag.Function: {
                if (node.returnType.tag !== Tag.RefInfer) {
                    break;
                }

                nodes[i] = Object.assign({}, nodes[i], {
                });
                break;
            }
                
            case Tag.Set: {
                if (node.target.tag !== Tag.RefId) {
                    break;
                }

                const targetId = node.target.target;
                const target = nodes[targetId];
                if (target.tag !== Tag.Variable) {
                    break;
                }

                if (target.type.tag !== Tag.RefInfer) {
                    break;
                }

                nodes[targetId] = Object.assign({}, target, {
                    type: getType(ctx, node.value),
                });
                break;
            }
                
            case Tag.ForEach: {
                const element = resolve(ctx, node.element) as Variable;

                if (element.type.tag !== Tag.RefInfer) {
                    break;
                }

                nodes[node.element.target] = Object.assign({}, element, {
                    type: getType(ctx, node.collection),
                })
            }
        }
    }
}