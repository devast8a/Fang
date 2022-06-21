import { Context } from './ast/context';
import { Node, Scope } from './ast/nodes';
import { serialize } from './ast/serialize';
import { Source } from './common/source';
import { parseAst } from './stages/AstGeneration';
import { parseSource } from './stages/Parse';
import { resolveNames } from './stages/NameResolver';
import { Interpreter } from './interpret/interpret';

export class Compiler {
    public static async compileFile(path: string) {
        const source = await Source.fromFile(path);

        const ast = new Array<Node>();
        const scope = new Scope(null, new Map());
        const context = new Context(null, scope, ast);

        const nodes = parseSource(source);

        const root = parseAst(context, nodes);
        resolveNames(context, root);

        console.log("=== root ===");
        console.log(root);
        console.log("=== scope ===");
        console.log(scope.symbols);
        console.log("=== ast ===");
        console.log(serialize(ast));
    }
}