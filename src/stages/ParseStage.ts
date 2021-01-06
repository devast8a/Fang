import { Parser } from 'nearley';
import { Source } from '../common/source';
import { Compiler } from '../compile';
import { Main } from '../parser/ast_builders';
import Grammar from '../parser/grammar';

export class ParseStage {
    public execute(compiler: Compiler, source: Source) {
        const parser = new Parser(Grammar);
        parser.feed(source.content);

        if (parser.results.length > 1) {
            throw new Error("Internal Error: AMBIGUOUS GRAMMAR");
        }

        if (parser.results.length === 0) {
            throw new Error("Internal Error: INCOMPLETE PARSE");
        }

        return parser.results[0];
    }
}

export class AstGenerationStage {
    public execute(compiler: Compiler, parseTree: any[], source: Source) {
        const nodes = [];

        for (let index = 0; index < parseTree.length; index += 2) {
            const node = Main.parse(parseTree[index]);

            if (node === null) {
                throw new Error("Broken Assertion: Output of Parser.parse shouldn't be null if the input isn't null");
            }

            nodes.push(node);
        }

        return nodes;
    }
}