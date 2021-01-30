import { Source } from './common/source';
import { ParseStage } from './stages/ParseStage';
import { AstGenerationStage } from "./stages/AstGenerationStage";
import * as Fs from 'fs';
import { Macro0Stage } from './stages/Macro0Stage';
import { NameResolutionStage } from './stages/NameResolutionStage';
import { MonomorphizeStage } from './stages/MonomorphizeStage';
import { TargetC } from './stages/TargetC';
import { TypeChecker } from './stages/TypeChecker';
import { RNode } from './nodes/resolved/RNode';

export class Compiler {
    private parse = new ParseStage();
    private astGeneration = new AstGenerationStage();
    private macro0Stage = new Macro0Stage();
    private nameResolution = new NameResolutionStage();
    private monomorphize = new MonomorphizeStage();
    private typeChecker = new TypeChecker();
    private target = new TargetC();

    private map = new Map<string, RNode[]>();

    public async parseFile(arg0: string | Source): Promise<RNode[]>
    {
        let source: Source;
        if (arg0 instanceof Source) {
            source = arg0;
        } else {
            source = new Source(arg0, await Fs.promises.readFile(arg0, "utf8"));
        }

        //const directory = Path.dirname(source.path);

        console.group(`Parsing ${source.path}`);
        console.time(`${source.path} Total`);

        console.time(`${source.path} Parsing`);
        const parseNodes = this.parse.execute(this, source);
        console.timeEnd(`${source.path} Parsing`);

        console.time(`${source.path} Ast Generation`);
        const nodes = this.astGeneration.execute(this, parseNodes, source);
        console.timeEnd(`${source.path} Ast Generation`);

        this.map.set(source.path, nodes);

        console.time(`${source.path} Macro Execution`);
        await this.macro0Stage.execute(this, nodes, source);
        console.timeEnd(`${source.path} Macro Execution`);

        console.timeEnd(`${source.path} Total`);
        console.groupEnd();

        return nodes;
    }

    public async compile(path: string): Promise<string>
    public async compile(source: Source): Promise<string>
    public async compile(arg0: string | Source): Promise<string>
    {
        const uNodes = await this.parseFile(arg0);

        console.time("Name Resolution");
        const rNodes = this.nameResolution.execute(uNodes);
        console.timeEnd("Name Resolution");

        console.time("Macro Execution");
        console.timeEnd("Macro Execution");

        console.time("Type Checking");
        const errors = new Array<any>();
        this.typeChecker.check(rNodes, errors);
        console.log(errors);
        console.timeEnd("Type Checking");

        console.time("Monomorphization");
        const mNodes = this.monomorphize.monomorphize(rNodes);
        console.timeEnd("Monomorphization");

        console.time("Analysis");
        console.timeEnd("Analysis");

        console.time("Code Generation");
        //console.log(mNodes);
        for (const node of mNodes) {
            this.target.emit(node, "");
        }
        console.log(this.target.output.join(""));
        console.timeEnd("Code Generation");

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