import { Ctx as Ctx } from './ast/context';
import { Tag } from './ast/nodes';
import { Source } from './common/source';
import { resolveNames } from './stages/NameResolver';
import { Interpreter } from './interpret/interpret';
import { FangGrammar } from './grammar/grammar';
import { promises as fs } from 'fs';
import { formatAst } from './ast/formatter';
import { handleTypes } from './stages/TypeSystem';
// import { resolve } from './stages/Resolver';

export class Compiler {
    public static async compileFile(path: string) {
        const source = await Source.fromFile(path);

        const ctx = Ctx.createRoot();

        const parser = FangGrammar.toParser();

        const root = parser.parse(ctx, source.content);
        ctx.root = root;

        let enableTypeChecking = false;

        const scope = resolveNames(ctx);

        for (const { targetId: target } of root) {
            const node = ctx.nodes[target];

            switch (node.tag) {
                case Tag.BlockAttribute: {
                    if (node.target.tag !== Tag.RefName) {
                        break;
                    }
                    switch (node.target.target) {
                        case 'DEBUG_TYPE_CHECK': enableTypeChecking = true; break;
                        case 'DEBUG_PRINT_AST': await fs.writeFile('serialized.out', formatAst(ctx, root)); break;
                    }
                }
            }
        }

        if (enableTypeChecking) {
            console.log("Type checking enabled")
            handleTypes(ctx);
        }

        return new Interpreter(ctx, root, scope);
    }
}