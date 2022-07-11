import { Ctx as Ctx } from './ast/context';
import { RefId, Scope, Tag } from './ast/nodes';
import * as Nodes from './ast/nodes';
import { Source } from './common/source';
import { check, infer, resolveNames } from './stages/NameResolver';
import { Interpreter } from './interpret/interpret';
import { serialize } from './ast/serialize';
import { FangGrammar } from './grammar/grammar';
import { promises as fs } from 'fs';

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