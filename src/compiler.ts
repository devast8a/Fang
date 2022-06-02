import { Context } from './ast/context';
import { Node, RefId, Scope } from './ast/nodes';
import { serialize } from './ast/serialize';
import { Source } from './common/source';
import { parseAst } from './stages/AstGenerationStage';
import { parseSource } from './stages/ParseStage';
import { resolveNames } from './stages/resolveNames';

export class Compiler {
    public static async compileFile(path: string) {
        const source = await Source.fromFile(path);

        // TODO: Reserve id 0 for the module or something
        const id = new RefId(0);

        const ast = new Array<Node>();
        const scope = new Scope(null, new Map());
        const context = new Context(null, scope, ast);

        const nodes = parseSource(source);

        const root = parseAst(context, nodes);

        const resolved = resolveNames(context, root);

        console.log("=== root ===");
        console.log(root);
        console.log("=== scope ===");
        console.log(scope.symbols);
        console.log("=== ast ===");
        console.log(serialize(ast));
    }
}