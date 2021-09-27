import * as Fs from 'fs';
import { AstGenerationStage } from "./stages/AstGenerationStage";
import { Context, Module, FunctionFlags, Node, RootId, Tag, VariableFlags } from './nodes';
import { Source } from './common/source';
import { builtin } from './Builtin';
import { checkLifetime } from './stages/checkLifetime';
import { checkType } from './stages/checkType';
import { nameResolution } from './stages/nameResolution';
import { TargetC } from './stages/targetC';
import { transformRemoveNesting } from './stages/transformRemoveNesting';
import { resolveOverload } from './stages/resolveOverload';
import { resolveNodes } from './stages/nodeResolution';
import { ParserStage } from './stages/ParseStage';
import { Visitor } from './ast/visitor';
import { inferType } from './stages/inferType';
import { markAbstractFunctions } from './stages/markAbstractFunctions';
import { InstantiateState, transformInstantiate } from './stages/instantiate';
import { mangleNames } from './stages/mangleNames';

export interface ParseContext {
    source: Source;
    context: Context;
}

export interface ParseStage {
    name: string;
    execute(nodes: Node[], context: ParseContext): Node[];
}

export interface CompileStage {
    name: string;
    execute(context: Context): void;
}

function wrap<T>(visitor: Visitor<T>, state: T) {
    return (context: Context) => visitor(context.module, context, state);
}

export class Compiler {
    private parseStages: ParseStage[] = [
        new ParserStage(),
        new AstGenerationStage(),
    ];

    private compileStages: CompileStage[] = [
        {name: "Symbol Resolution",     execute: (context) => {nameResolution(context, builtin.scope.newChildScope()); }},
        {name: "Type Inference",        execute: inferType},
        {name: "Symbol Resolution 2",   execute: wrap(resolveNodes, null)},
        {name: "Overload Resolution",   execute: wrap(resolveOverload, null)},
        {name: "Type Check",            execute: wrap(checkType, null)},
        {name: "Lifetime Check",        execute: checkLifetime},
        {name: "Remove Nesting",        execute: transformRemoveNesting},
        {name: "Mangle Names",          execute: wrap(mangleNames, null)},
        {name: "Mark Abstract Funcs",   execute: wrap(markAbstractFunctions, null)},
        {name: "Instantiate",           execute: wrap(transformInstantiate, new InstantiateState())},
    ];

    public async parseFile(source: string | Source, context: Context): Promise<Node[]>
    {
        if (!(source instanceof Source)) {
            source = new Source(source, await Fs.promises.readFile(source, "utf8"));
        }
        
        console.group(`Parsing ${source.path}`);
        console.time(`${source.path} Total`);

        let nodes = new Array<Node>();
        for (const stage of this.parseStages) {
            console.time(`${source.path} ${stage.name}`);
            nodes = stage.execute(nodes, {source, context});
            console.timeEnd(`${source.path} ${stage.name}`);
        }

        console.timeEnd(`${source.path} Total`);
        console.groupEnd();

        return nodes;
    }

    public async compile(source: string | Source): Promise<string>
    {
        const module  = new Module();
        const context = new Context(this, RootId, RootId, module);

        console.group(`Compiling`);
        console.time("Total");

        await this.parseFile(source, context);

        Fs.writeFileSync(`build/output/0-initial.txt`, serialize(context.module));

        let id = 1;
        for (const stage of this.compileStages) {
            console.time(stage.name);
            stage.execute(context);
            console.timeEnd(stage.name);

            Fs.writeFileSync(`build/output/${id}-${stage.name}.txt`, serialize(context.module));
            id++;
        }

        const target = new TargetC();
        target.emitProgram(context);
        const program = target.toString();

        console.timeEnd("Total");
        console.groupEnd();

        return program;
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

function serialize(node: Node) {
    function convert(this: any, key: string, value: any) {
        if (typeof(value) === 'object' && value !== null && value.constructor === Map) {
            return Array.from(value);
        }

        if (key === "tag" && typeof(value) === 'number') {
            return Tag[value];
        }

        if (key === "flags" && typeof(this.tag) === 'number') {
            const self = this as Node;

            switch (self.tag) {
                case Tag.DeclFunction: return convertFlags("FunctionFlags", FunctionFlags, value);
                case Tag.DeclVariable: return convertFlags("VariableFlags", VariableFlags, value);
            }
        }

        return value;
    }

    return JSON.stringify(node, convert, 4);
}

interface Flags {
    [index: number]: string;
}

function convertFlags(name: string, flags: Flags, value: number) {
    let flag = 1;
    const output = [];

    while (value >= flag) {
        if ((value & flag) !== 0) {
            output.push(name + "." + flags[flag]);
        }
        flag <<= 1;
    }

    return output.join(' | ')
}
