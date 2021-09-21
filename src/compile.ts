import * as Fs from 'fs';
import { AstGenerationStage } from "./stages/AstGenerationStage";
import { Context, Decl, DeclModule, DeclStruct, Node, Tag } from './nodes';
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

export interface ParseContext {
    source: Source;
    context: Context;
}

export interface ParseStage {
    name: string;
    execute(compiler: Compiler, nodes: Node[], context: ParseContext): Node[];
}

export interface CompileStage {
    name: string;
    execute(compiler: Compiler, context: Context): Node[];
}

export class VisitorWrapper<T> implements CompileStage {
    public constructor(
        public readonly name: string,
        public readonly visitor: Visitor<T>,
        public readonly state: T,
    ) {}

    public execute(compiler: Compiler, context: Context<Decl>): Node[] {
        for (const node of context.module.nodes) {
            if (node.tag === Tag.DeclFunction) {
                // TODO: Create new copy of function
                node.body = this.visitor.array(node.body, context.next(node), this.state);
            }
        }

        // TODO: Remove when we change the stage system
        return context.module.nodes;
    }
}

export class Compiler {
    private parseStages: ParseStage[] = [
        new ParserStage(),
        new AstGenerationStage(),
    ];

    private compileStages: CompileStage[] = [
        {name: "Symbol Resolution",   execute: (compiler, context) => {nameResolution(context.module.nodes, builtin.scope.newChildScope()); return context.module.nodes; }},
        new VisitorWrapper("Symbol Resolution II", resolveNodes, null),
        new VisitorWrapper("Overload Resolution", resolveOverload, null),
        new VisitorWrapper("Type Check", checkType, null),
        {name: "Lifetime Check",      execute: (compiler, context) => {checkLifetime(context.module.nodes); return context.module.nodes;}},
        {name: "Remove Nesting",      execute: (compiler, context) => {transformRemoveNesting(context, context.module.nodes); return context.module.nodes;}},
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
            nodes = stage.execute(this, nodes, {source, context});
            console.timeEnd(`${source.path} ${stage.name}`);
        }

        console.timeEnd(`${source.path} Total`);
        console.groupEnd();

        return nodes;
    }

    public async compile(source: string | Source): Promise<string>
    {
        const root    = new DeclStruct(0, 0, ".root", new Map(), new Set());
        const module  = new DeclModule([root]);
        const context = new Context(root.id, module);

        console.group(`Compiling`);
        console.time("Total");

        let nodes = await this.parseFile(source, context);

        for (const stage of this.compileStages) {
            console.time(stage.name);
            nodes = stage.execute(this, context);
            console.timeEnd(stage.name);
        }

        const target = new TargetC();
        target.emitProgram(nodes);
        const program = target.toString();

        console.timeEnd("Total");
        console.groupEnd();

        console.log(module);

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