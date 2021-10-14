import * as Fs from 'fs';
import { Source } from './common/source';
import { serialize } from './ast/serialize';
import { parseSource } from './stages/ParseStage';
import { AdditionalData, Location, parseAst } from './stages/AstGenerationStage';
import { CompileError, Context, Module, RootId } from './nodes';
import { resolveNames } from './stages/resolveNames';
import { TargetC } from './targets/targetC';
import { inferTypes } from './stages/inferTypes';
import { checkTypes } from './stages/checkTypes';
import { markAbstractFunctions } from './stages/markAbstractFunctions';
import { Visitor } from './ast/visitor';
import { instantiate, InstantiateState } from './stages/instantiate';
import { evaluateCompileTime } from './stages/evaluateCompileTime';
import { flatten } from './stages/flatten';

function visitor(visitor: Visitor<null>): (context: Context) => Module
function visitor<State>(visitor: Visitor<State>, state: State): (context: Context) => Module
function visitor<State>(visitor: Visitor<State>, state?: State) {
    return (context: Context) => visitor(context, context.module, RootId, state ?? (null as any));
}

export class Compiler {
    private locations!: AdditionalData<Location>;
    private source!: Source;

    private stages: [string, (context: Context) => Module][] = [
        ['Resolve Names', visitor(resolveNames)],
        ['Type Inference', visitor(inferTypes)],
        ['Check: Types', visitor(checkTypes)],
        ['Mark Generic Functions', visitor(markAbstractFunctions)],
        ['Instantiate', visitor(instantiate, new InstantiateState())],
        ['Flatten', flatten],
        ['Evaluate Compile Time', visitor(evaluateCompileTime)],
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

        let content = await Fs.promises.readFile(path, 'utf8');
        content += `
            # Manually declare builtin functions and types
            #   This crap will be cleaned up eventually and be part of an automatically included prelude
            struct u32
            struct bool
            struct str
            fn infix+(left: u32, right: u32) -> u32
            fn infix-(left: u32, right: u32) -> u32
            fn infix%(left: u32, right: u32) -> u32
            fn infix<(left: u32, right: u32) -> bool
            fn infix<=(left: u32, right: u32) -> bool
            fn infix==(left: u32, right: u32) -> bool
            fn printf(s: str, d: u32)
        `;
        const source = new Source(path, content);

        return compiler.compile(source);
    }
}