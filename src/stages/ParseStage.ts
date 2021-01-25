import { Parser } from 'nearley';
import { Source } from '../common/source';
import { Compiler } from '../compile';
import Grammar from '../parser/grammar';

export class ParseStage {
    public execute(compiler: Compiler, source: Source) {
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