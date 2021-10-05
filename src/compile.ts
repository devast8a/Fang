import * as Fs from 'fs';
import { Source } from './common/source';
import { serialize } from './ast/serialize';
import { parseSource } from './stages/ParseStage';

export class Compiler {
    public async parseFile(source: string | Source): Promise<null>
    {
        if (!(source instanceof Source)) {
            source = new Source(source, await Fs.promises.readFile(source, "utf8"));
        }
        
        console.group(`Parsing ${source.path}`);
        console.time(`${source.path} Total`);

        const ast = parseSource(source);
        const nodes = parseAst(ast);


        console.timeEnd(`${source.path} Total`);
        console.groupEnd();

        return null;
    }

    public async compile(source: string | Source): Promise<string>
    {
        await this.parseFile(source);

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