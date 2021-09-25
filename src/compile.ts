import * as Fs from 'fs';
import { AstGenerationStage } from "./stages/AstGenerationStage";
import { Context, DeclModule, Node, RootId, Tag } from './nodes';
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
import { visit, Visitor } from './ast/visitor';
import { inferType } from './stages/inferType';

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
    return (context: Context) => {
        for (const node of context.module.nodes) {
            if (node.tag === Tag.DeclFunction) {
                // TODO: Create new copy of function
                node.body = visit.array(node.body, context.next(node), state, visitor);
            }
        }
    }
}

export class Compiler {
    private parseStages: ParseStage[] = [
        new ParserStage(),
        new AstGenerationStage(),
    ];

    private compileStages: CompileStage[] = [
        {name: "Symbol Resolution",   execute: (context) => {nameResolution(context.module.nodes, builtin.scope.newChildScope(), context); }},
        {name: "Type Inference",      execute: inferType},
        {name: "Symbol Resolution 2", execute: wrap(resolveNodes, null)},
        {name: "Overload Resolution", execute: wrap(resolveOverload, null)},
        {name: "Type Check",          execute: wrap(checkType, null)},
        {name: "Lifetime Check",      execute: checkLifetime},
        {name: "Remove Nesting",      execute: transformRemoveNesting},
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
        const module  = new DeclModule();
        const context = new Context(this, RootId, module);

        console.group(`Compiling`);
        console.time("Total");

        await this.parseFile(source, context);

        for (const stage of this.compileStages) {
            //serialize((context.module.nodes[4] as any).body)

            console.time(stage.name);
            stage.execute(context);
            console.timeEnd(stage.name);
        }

        serialize(module);

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
    function convert(key: string, value: any) {
        if (typeof(value) === 'object' && value !== null && value.constructor === Map) {
            return Array.from(value);
        }

        if (key === "tag" && typeof(value) === 'number') {
            return Tag[value];
        }

        return value;
    }

    console.log(JSON.stringify(node, convert, 4));
}