import { Source } from './common/source';
import { AstGenerationStage, ParseStage } from './stages/ParseStage';

export class Compiler {
    private parse = new ParseStage();
    private astGeneration = new AstGenerationStage();

    public compile(source: Source) {
        console.time("Parsing");
        const parseTree = this.parse.execute(this, source);
        console.timeEnd("Parsing");

        console.time("Ast Generation");
        const nodes = this.astGeneration.execute(this, parseTree, source);
        console.timeEnd("Ast Generation");

        console.log(nodes);

        return "";
    }
}