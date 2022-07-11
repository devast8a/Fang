import { Node, Ref, RefId, Scope, Struct, Tag, Type, Variable } from './ast/nodes';
import { Ctx as Ctx } from './ast/context';
import * as Nodes from './ast/nodes';
import { Source } from './common/source';
import { resolveNames } from './stages/NameResolver';
import { Interpreter } from './interpret/interpret';
import { serialize } from './ast/serialize';
import { FangGrammar } from './grammar/grammar';
import { promises as fs } from 'fs';
import { unimplemented, unreachable } from './utils';

export class Compiler {
    public static async compileFile(path: string) {
        const source = await Source.fromFile(path);

        const scope = new Scope(null, new Map());
        const ctx = new Ctx(null, scope, []);

        populateBuiltins(ctx)

        //const nodes = parseSource(source);
        //const root = parseAst(context, nodes);

        const parser = FangGrammar.toParser();
        const root = parser.parse(ctx, source.content);

        resolveNames(ctx, root);

        // console.log(serialize(context.nodes), context.scope);

        let enableTypeChecking = false;

        for (const { target } of root) {
            const node = ctx.nodes[target];

            switch (node.tag) {
                case Tag.BlockAttribute: {
                    if (node.target.tag !== Tag.RefName) {
                        break;
                    }
                    switch (node.target.target) {
                        case 'DEBUG_TYPE_CHECK': enableTypeChecking = true; break;
                        case 'DEBUG_PRINT_AST': await fs.writeFile('serialized.json', serialize(ctx.nodes)); break;
                    }
                }
            }
        }

        if (enableTypeChecking) {
            console.log("Type checking enabled")
            infer(ctx);
            check(ctx);
        }

        return new Interpreter(ctx, root);
    }
}

function mkFunc(ctx: Ctx, name: string, returnType: RefId, parameters: RefId[]) {
    return ctx.add(children => {
        const ps = parameters.map((parameter, index) =>
            ctx.add(new Nodes.Variable(children.scope, `_${index}`, parameter))
        );

        return new Nodes.Function(ctx.scope, children.scope, name, returnType, ps, [], true)
    });
}

function populateBuiltins(ctx: Ctx) {
    const u32 = ctx.add(children => new Nodes.Struct(ctx.scope, children.scope, 'u32', []));
    const bool = ctx.add(children => new Nodes.Struct(ctx.scope, children.scope, 'bool', []));

    mkFunc(ctx, 'infix..', u32, [u32, u32])
    mkFunc(ctx, 'infix%', u32, [u32, u32])
    mkFunc(ctx, 'infix+', u32, [u32, u32])
    mkFunc(ctx, 'infix<', bool, [u32, u32])
    mkFunc(ctx, 'infix==', bool, [u32, u32])
    mkFunc(ctx, 'infixor', bool, [bool, bool])
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

function check(ctx: Ctx) {
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

function infer(ctx: Ctx) {
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
