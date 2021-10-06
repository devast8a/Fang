import { Parser } from 'nearley';
import { Source } from '../common/source';
import Grammar from '../parser/grammar';
import { PNode } from '../parser/post_processor';

export function parseSource(source: Source): PNode[] {
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