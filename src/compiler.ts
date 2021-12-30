import * as Fs from 'fs';
import { Source } from './common/source';
import { serialize } from './ast/serialize';
import { parseSource } from './stages/ParseStage';
import { parseAst } from './stages/AstGenerationStage';
import { CompileError, Context, Module, MutContext, RootId } from './nodes';
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
import { resolveImports } from './stages/resolveImports';

function visitor(visitor: Visitor<null>): (context: Context) => Module
function visitor<State>(visitor: Visitor<State>, state: State): (context: Context) => Module
function visitor<State>(visitor: Visitor<State>, state?: State) {
    return (context: Context) => visitor(context, context.module, RootId, state ?? (null as any));
}

export type StageEvent = (name: string, stage: (context: Context) => Module, module: Module) => void;

export class Compiler {
    private stages: [string, (context: Context) => Module][] = [
        ['Resolve Imports', visitor(resolveImports)],
        ['Resolve Names', visitor(resolveNames)],
        ['Check Types', visitor(checkTypes)],
        //['Check Lifetime', checkLifetime],
        ['Flatten', flatten],
        ['Mark Generic Functions', visitor(markAbstractFunctions)],
        ['Instantiate', visitor(instantiate, new InstantiateState())],
        ['Mangle Names', visitor(mangleNames)],
        ['Evaluate Compile Time', visitor(evaluateCompileTime)],
    ];

    private stop = false;

    public error(error: CompileError) {
        this.stop = true;

        const symbol = chalk.bgRedBright.whiteBright(` ! `);
        const message = (error as any).constructor.name;

        const file = chalk.cyanBright('test.fang');
        const line = chalk.yellowBright(100);

        console.error(`${symbol}  ${file}:${line}  ${message}`);
    }

    public parse(source: Source): Module
    {
        const ast = parseSource(source);
        const root = MutContext.createRoot(this);
        const body = parseAst(root, ast);

        return new Module(root.finalize(body));
    }

    public compile(source: Source): string
    {
        let module = this.parse(source);

        for (const [name, fn] of this.stages) {
            module = fn(Context.fromModule(this, module));

            if (this.onNextStage) {
                this.onNextStage(name, fn, module);
            }

            // A condition has been raised that requires compilation to stop (typically an error has ben raised)
            if (this.stop) {
                return "";
            }
        }

        const target = new TargetC();
        target.emitProgram(Context.fromModule(this, module));
        const code = target.toString();

        return code;
    }

    // TODO: Replace with an event system
    public onNextStage?: StageEvent;

    public static compile(source: Source, stage?: StageEvent) {
        const compiler = new Compiler();
        compiler.onNextStage = stage;

        source.content += `
            # Manually declare builtin functions and types
            #   This will be cleaned up eventually and be part of an automatically included prelude
            fn alias() -> void

            struct u32
            struct bool
            struct str
            struct Ptr generic<T>
            struct Size
            struct void

            fn infix+(left: u32, right: u32) -> u32
            fn infix-(left: u32, right: u32) -> u32
            fn infix%(left: u32, right: u32) -> u32

            fn infix>(left: u32, right: u32) -> bool
            fn infix>=(left: u32, right: u32) -> bool
            fn infix<(left: u32, right: u32) -> bool
            fn infix<=(left: u32, right: u32) -> bool
            fn infix==(left: u32, right: u32) -> bool

            fn printf(s: str, d: u32)
            fn malloc(size: Size) -> Ptr
            fn realloc(ptr: Ptr, size: Size) -> Ptr

            fn deref_ptr(ptr: Ptr, index: Size, value: u32) -> u32
        `;

        return compiler.compile(source);
    }
}