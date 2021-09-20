import * as Fs from 'fs';
import { AstGenerationStage } from "./stages/AstGenerationStage";
import { Context, DeclModule, Node } from './nodes';
import { Source } from './common/source';
import { builtin } from './Builtin';
import { checkLifetime } from './stages/checkLifetime';
import { checkType } from './stages/checkType';
import { nameResolution } from './stages/nameResolution';
import { transformInferType } from './stages/transformInferType';
import { TargetC } from './stages/targetC';
import { transformRemoveNesting } from './stages/transformRemoveNesting';
import { TransformExecuteMacroStage } from './stages/transfromExecuteMacro';
import { transformInstantiate } from './stages/transformInstantiate';
import { markAbstractFunctions } from './stages/markAbstractFunctions';
import { nameMangle } from './stages/nameMangle';
import { resolveOverload } from './stages/resolveOverload';
import { resolveNodes } from './stages/nodeResolution';
import { ParserStage } from './stages/ParseStage';

export interface ParseContext {
    source: Source;
    module: DeclModule;
}

export interface ParseStage {
    name: string;
    execute(compiler: Compiler, nodes: Node[], context: ParseContext): Node[];
}

export interface CompileStage {
    name: string;
    execute(compiler: Compiler, context: Context): Node[];
}

export class Compiler {
    private parseStages: ParseStage[] = [
        new ParserStage(),
        new AstGenerationStage(),
        new TransformExecuteMacroStage(),
    ];

    private compileStages: CompileStage[] = [
        {name: "Symbol Resolution",   execute: (compiler, context) => {nameResolution(context.module.nodes, builtin.scope.newChildScope()); return context.module.nodes; }},
        {name: "Type Inference",      execute: (compiler, context) => transformInferType.array(context.module.nodes, context, null)},
        {name: "Node Resolution",     execute: (compiler, context) => resolveNodes.array(context.module.nodes, context, null)},
        {name: "Overload Resolution", execute: (compiler, context) => resolveOverload.array(context.module.nodes, context, null)},
        {name: "Type Check",          execute: (compiler, context) => checkType.array(context.module.nodes, context, null)},
        {name: "Lifetime Check",      execute: (compiler, context) => {checkLifetime(context.module.nodes); return context.module.nodes;}},
        {name: "Symbol Mangling",     execute: (compiler, context) => nameMangle.array(context.module.nodes, context, null)},
        {name: "Mark Abstract",       execute: (compiler, context) => markAbstractFunctions.array(context.module.nodes, context, null)},
        {name: "Remove Nesting",      execute: (compiler, context) => {transformRemoveNesting(context, context.module.nodes); return context.module.nodes;}},
        {name: "Instantiation",       execute: (compiler, context) => transformInstantiate.array(context.module.nodes, context, null)},
    ];

    public async parseFile(source: string | Source, module: DeclModule): Promise<Node[]>
    {
        if (!(source instanceof Source)) {
            source = new Source(source, await Fs.promises.readFile(source, "utf8"));
        }
        
        console.group(`Parsing ${source.path}`);
        console.time(`${source.path} Total`);

        let nodes = new Array<Node>();
        for (const stage of this.parseStages) {
            console.time(`${source.path} ${stage.name}`);
            nodes = stage.execute(this, nodes, {source, module});
            console.timeEnd(`${source.path} ${stage.name}`);
        }

        console.timeEnd(`${source.path} Total`);
        console.groupEnd();

        return nodes;
    }

    public async compile(source: string | Source): Promise<string>
    {
        const module = new DeclModule([]);
        const context = new Context(module, module);

        // TODO: Replace with a mod reference???
        module.nodes.push(module);

        console.group(`Compiling`);
        console.time("Total");

        let nodes = await this.parseFile(source, module);

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