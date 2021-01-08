import { Source } from '../common/source';
import { Compiler } from '../compile';
import { Main } from '../parser/ast_builders';


export class AstGenerationStage {
    public execute(compiler: Compiler, parseNodes: any[], source: Source) {
        const nodes = [];

        for (const parseNode of parseNodes) {
            const node = Main.parse(parseNode);

            if (node === null) {
                throw new Error("Broken Assertion: Output of Parser.parse shouldn't be null if the input isn't null");
            }

            nodes.push(node);
        }

        return nodes;
    }
}