import { Context } from './ast/context';
import { Scope, Tag } from './ast/nodes';
import * as Nodes from './ast/nodes';
import { Source } from './common/source';
import { resolveNames } from './stages/NameResolver';
import { Interpreter } from './interpret/interpret';
import { serialize } from './ast/serialize';
import { FangGrammar } from './grammar/grammar';

export class Compiler {
    public static async compileFile(path: string) {
        const source = await Source.fromFile(path);

        const scope = new Scope(null, new Map());
        const context = new Context(null, scope, []);

        populateBuiltins(context)

        //const nodes = parseSource(source);
        //const root = parseAst(context, nodes);

        const parser = FangGrammar.toParser();
        const root = parser.parse(context, source.content);

        resolveNames(context, root);

        // console.log(serialize(context.nodes), context.scope);

        for (const { target } of root) {
            const node = context.nodes[target];

            switch (node.tag) {
                case Tag.BlockAttribute: {
                    console.log(serialize(context.nodes));
                }
            }
        }

        return new Interpreter(context, root);
    }
}

function populateBuiltins(parent: Context) {
    parent.add(child => new Nodes.Struct(parent.scope, child.scope, "u32", []));
}