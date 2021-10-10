import * as Fs from 'fs';
import { Source } from './common/source';
import { serialize } from './ast/serialize';
import { parseSource } from './stages/ParseStage';
import { parseAst } from './stages/AstGenerationStage';
import { Context, Module, RootId } from './nodes';
import { resolveNames } from './stages/resolveNames';
import { TargetC } from './targets/targetC';
import { inferTypes } from './stages/inferTypes';
import { checkLifetime } from './stages/checkLifetime';

export class Compiler {
    private stages: [string, (context: Context) => Module][] = [
        ['Resolve Names', (context) => resolveNames(context, context.module, RootId, null)],
        ['Type Inference', (context) => inferTypes(context, context.module, RootId, null)],
        ['Check: Lifetime', (context) => checkLifetime(context)],
    ];

    public async parseFile(source: string | Source): Promise<Module>
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

        console.timeEnd(`${source.path} Total`);
        console.groupEnd();

        return new Module(nodes);
    }

    public async compile(source: string | Source): Promise<string>
    {
        let module = await this.parseFile(source);

        let id = 0;
        Fs.writeFileSync(`build/output/${id++}-Initial.txt`, serialize(module));
        for (const [name, fn] of this.stages) {
            console.time(name);
            module = fn(new Context(module, module.children, RootId));
            console.timeEnd(name);

            Fs.writeFileSync(`build/output/${id++}-${name}.txt`, serialize(module));
        }

        console.time("Code Generation");
        const target = new TargetC();
        target.emitProgram(new Context(module, module.children, RootId));
        const code = target.toString();
        console.timeEnd("Code Generation");
        Fs.writeFileSync(`build/output/${id++}-Code Generation.txt`, code);

        return code;
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