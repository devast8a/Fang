import { Ctx as Ctx } from './ast/context';
import { Tag } from './ast/nodes';
import { Source } from './common/source';
import { resolveNames } from './stages/NameResolver';
import { Interpreter } from './interpreter/Interpreter';
import { FangGrammar } from './grammar/grammar';
import { promises as fs } from 'fs';
import { formatNodes } from './ast/formatter';
import { processTypes } from './stages/TypeSystem';
import { serialize } from './ast/serialize';

export class Compiler {
    public static async compileFile(path: string) {
        const source = await Source.fromFile(path);

        const ctx = Ctx.createRoot();

        const parser = FangGrammar.toParser();

        const root = parser.parse(ctx, source.content);
        ctx.root = root;

        const scope = resolveNames(ctx);

        for (const ref of root) {
            const node = ctx.get(ref);

            switch (node.tag) {
                case Tag.BlockAttribute: {
                    const target = node.attribute.tag === Tag.RefByName ? node.attribute.name : '';

                    switch (target) {
                        case 'DEBUG_LOGGING': ctx.LOGGING = 1; break;
                    }
                }
            }
        }

        processTypes(ctx);

        for (const ref of root) {
            const node = ctx.get(ref);

            switch (node.tag) {
                case Tag.BlockAttribute: {
                    const target = node.attribute.tag === Tag.RefByName ? node.attribute.name : '';

                    switch (target) {
                        case 'DEBUG_PRINT_AST': await fs.writeFile('serialized.out', formatNodes(ctx, root)); break;
                        case 'DEBUG_PRINT_AST2': await fs.writeFile('serialized.out', serialize(ctx.nodes)); break;
                    }
                }
            }
        }

        return new Interpreter(ctx, root, scope);
    }
}