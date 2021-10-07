import * as Fs from 'fs';
import { Source } from './common/source';
import { serialize } from './ast/serialize';
import { parseSource } from './stages/ParseStage';
import { parseAst } from './stages/AstGenerationStage';
import { Module, RootId } from './nodes';
import { resolveNames } from './stages/resolveNames';

export class Compiler {
    public async parseFile(source: string | Source): Promise<null>
    {
        if (!(source instanceof Source)) {
            source = new Source(source, await Fs.promises.readFile(source, "utf8"));
        }
        
        console.group(`Parsing ${source.path}`);
        console.time(`${source.path} Total`);

        console.time(`${source.path} Parsing`);
        const ast = parseSource(source);
        console.timeEnd(`${source.path} Parsing`);

        console.time(`${source.path} Ast Generation`);
        const nodes = parseAst(ast);
        console.timeEnd(`${source.path} Ast Generation`);

        const module = new Module(nodes);

        const before = serialize(module);
        const module2 = resolveNames(module, module, RootId, RootId);
        const after = serialize(module);

        if (before !== after) {
            console.log('OOPS MUTATING!');
        }

        Fs.writeFileSync('build/output/0-Ast Generation.txt', after);
        Fs.writeFileSync('build/output/1-Name Resolution.txt', serialize(module2));

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