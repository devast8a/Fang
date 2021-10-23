import * as Fs from 'fs';
import { Source } from './common/source';
import { serialize } from './ast/serialize';
import { parseSource } from './stages/ParseStage';
import { parseAst } from './stages/AstGenerationStage';
import { CompileError, Context, Module, RootId } from './nodes';
import { resolveNames } from './stages/resolveNames';
import { TargetC } from './targets/targetC';
import { checkTypes } from './stages/checkTypes';
import { markAbstractFunctions } from './stages/markAbstractFunctions';
import { Visitor } from './ast/visitor';
import { instantiate, InstantiateState } from './stages/instantiate';
import { evaluateCompileTime } from './stages/evaluateCompileTime';
import { flatten } from './stages/flatten';
import { mangleNames } from './stages/mangleNames';
import chalk from 'chalk';
import { checkLifetime } from './stages/checkLifetime';

function visitor(visitor: Visitor<null>): (context: Context) => Module
function visitor<State>(visitor: Visitor<State>, state: State): (context: Context) => Module
function visitor<State>(visitor: Visitor<State>, state?: State) {
    return (context: Context) => visitor(context, context.module, RootId, state ?? (null as any));
}

export class Compiler {
    private stages: [string, (context: Context) => Module][] = [
        ['Resolve Names', visitor(resolveNames)],
        ['Check Types', visitor(checkTypes)],
        ['Check Lifetime', checkLifetime],
        ['Mark Generic Functions', visitor(markAbstractFunctions)],
        ['Instantiate', visitor(instantiate, new InstantiateState())],
        ['Mangle Names', visitor(mangleNames)],
        ['Flatten', flatten],
        ['Evaluate Compile Time', visitor(evaluateCompileTime)],
    ];

    private stop = false;

    public error(error: CompileError) {
        this.stop = true;

        const symbol = chalk.bgRedBright.whiteBright(` ! `);
        const name = (error as any).constructor.name;

        console.error(`${symbol} ${name}`);
    }

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
        const {children} = parseAst(this, ast);
        console.timeEnd(`${source.path} Ast Generation`);

        console.timeEnd(`${source.path} Total`);
        console.groupEnd();

        return new Module(children);
    }

    public async compile(source: string | Source): Promise<string>
    {
        let module = await this.parseFile(source);

        let id = 0;
        Fs.writeFileSync(`build/output/${id++}-Initial.txt`, serialize(module));
        for (const [name, fn] of this.stages) {
            console.time(name);
            module = fn(Context.fromModule(this, module));
            console.timeEnd(name);

            Fs.writeFileSync(`build/output/${id++}-${name}.txt`, serialize(module));

            // A condition has been raised that requires compilation to stop (typically an error has ben raised)
            if (this.stop) {
                return "";
            }
        }

        console.time("Code Generation");
        const target = new TargetC();
        target.emitProgram(Context.fromModule(this, module));
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
            struct Ptr
            struct Size
            fn infix+(left: u32, right: u32) -> u32
            fn infix-(left: u32, right: u32) -> u32
            fn infix%(left: u32, right: u32) -> u32
            fn infix<(left: u32, right: u32) -> bool
            fn infix<=(left: u32, right: u32) -> bool
            fn infix==(left: u32, right: u32) -> bool
            fn printf(s: str, d: u32)
            fn malloc(size: Size) -> Ptr
            fn realloc(ptr: Ptr, size: Size) -> Ptr
            fn deref_ptr(ptr: Ptr, index: Size) -> u32
        `;
        const source = new Source(path, content);

        return compiler.compile(source);
    }
}