import { Parser } from 'nearley';
import { Source } from '../common/source';
import { Compiler, Stage } from '../compile';
import { Node } from '../nodes';
import Grammar from '../parser/grammar';

export class ParseStage implements Stage {
    public name = "Parse";

    public execute(compiler: Compiler, nodes: Node[], source: Source) {
        if (nodes.length > 0) {
            throw new Error("ParseStage must have an empty array of nodes passed to it");
        }

        const parser = new Parser(Grammar);
        parser.feed(source.content);

        if (parser.results.length > 1) {
            parser.results.forEach((result, index) => {
                console.log(`========== ${index} ==========`)
                console.log(JSON.stringify(result, undefined, 4));
            });
            throw new Error("Internal Error: AMBIGUOUS GRAMMAR");
        }

        if (parser.results.length === 0) {
            throw new Error("Internal Error: INCOMPLETE PARSE");
        }

        return (parser.results[0] as any[]).filter((_, index) => index % 2 === 0);
    }
}