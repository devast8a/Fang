import * as Fs from 'fs';
import { AstGenerationStage } from "./stages/AstGenerationStage";
import { Node } from './nodes';
import { ParseStage } from './stages/ParseStage';
import { Source } from './common/source';
import { builtin } from './Builtin';
import { checkLifetimeNodes } from './stages/checkLifetime';
import { checkTypeNodes } from './stages/checkType';
import { nameResolution } from './stages/nameResolution';

export class Compiler {
    private parse = new ParseStage();
    private astGeneration = new AstGenerationStage();

    public async parseFile(source: string | Source): Promise<Node[]>
    {
        if (!(source instanceof Source)) {
            source = new Source(source, await Fs.promises.readFile(source, "utf8"));
        }

        //const directory = Path.dirname(source.path);

        console.group(`Parsing ${source.path}`);
        console.time(`${source.path} Total`);

        console.time(`${source.path} Parsing`);
        const parseNodes = this.parse.execute(this, source);
        console.timeEnd(`${source.path} Parsing`);

        console.time(`${source.path} Ast Generation`);
        const nodes = this.astGeneration.execute(this, parseNodes as any, source);
        console.timeEnd(`${source.path} Ast Generation`);

        console.timeEnd(`${source.path} Total`);
        console.groupEnd();

        return nodes;
    }

    public async compile(source: string | Source): Promise<string>
    {
        console.time("Total");
        const nodes = await this.parseFile(source);

        console.time(`Name Resolution`);
        const scope = builtin.scope.newChildScope();
        nameResolution(nodes, scope);
        console.timeEnd(`Name Resolution`);

        console.time(`Check>Types`);
        checkTypeNodes(nodes, undefined as any);
        console.timeEnd(`Check>Types`);

        console.time(`Check>Lifetime`);
        checkLifetimeNodes(nodes);
        console.timeEnd(`Check>Lifetime`);

        console.timeEnd("Total");
        return "";
    }

    public static async compile(path: string) {
        const compiler = new Compiler();
        const source = new Source(
            path,
            await Fs.promises.readFile(path, 'utf8')
        );

        return compiler.compile(source);
    }
}