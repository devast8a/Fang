import * as Fs from 'fs';
import { Source } from './common/source';
import { serialize } from './ast/serialize';
import { parseSource } from './stages/ParseStage';
import { AdditionalData, Location, parseAst } from './stages/AstGenerationStage';
import { CompileError, Context, Module, RootId } from './nodes';
import { resolveNames } from './stages/resolveNames';
import { TargetC } from './targets/targetC';
import { inferTypes } from './stages/inferTypes';
import { checkLifetime } from './stages/checkLifetime';
import { checkTypes } from './stages/checkTypes';
import { markAbstractFunctions } from './stages/markAbstractFunctions';
import { Visitor } from './ast/visitor';

function visitor(visitor: Visitor<null>) {
    return (context: Context) => visitor(context, context.module, RootId, null);
}

export class Compiler {
    private locations!: AdditionalData<Location>;
    private source!: Source;

    private stages: [string, (context: Context) => Module][] = [
        ['Resolve Names', visitor(resolveNames)],
        ['Type Inference', visitor(inferTypes)],
        ['Check: Lifetime', checkLifetime],
        ['Check: Types', visitor(checkTypes)],
        ['Mark Generic Functions', visitor(markAbstractFunctions)],
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
        const {children, locations} = parseAst(ast);
        console.timeEnd(`${source.path} Ast Generation`);

        this.locations = locations;
        this.source = source;

        console.timeEnd(`${source.path} Total`);
        console.groupEnd();

        return new Module(children);
    }

    public async compile(source: string | Source): Promise<string>
    {
        let module = await this.parseFile(source);

        const errors = new Array<CompileError>();

        let id = 0;
        Fs.writeFileSync(`build/output/${id++}-Initial.txt`, serialize(module));
        for (const [name, fn] of this.stages) {
            console.time(name);
            module = fn(new Context(errors, module, module.children, RootId));
            console.timeEnd(name);

            Fs.writeFileSync(`build/output/${id++}-${name}.txt`, serialize(module));
        }

        console.time("Code Generation");
        const target = new TargetC();
        target.emitProgram(new Context(errors, module, module.children, RootId));
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