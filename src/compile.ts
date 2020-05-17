import * as nearley from "nearley";
import Analyzer from './analysis';
import { Scope } from './ast/scope';
import { Class, Function, Tag, Thing, Type, Variable, VariableFlags } from './ast/things';
import TargetCGcc from './codegen';
import { Source } from './common/source';
import { CompilerError, ConsoleErrorFormatter } from './errors';
import Grammar from './parser/grammar';
import { Tag as AstTag } from './parser/post_processor';
import Polymorpher from './polymorph';
import TypeChecker from './type_check';
import { removeIntrinsics, registerIntrinsics } from './targets/c/intrinsics';

class Parse {
    public execute(compiler: Compiler){
        // TODO: Properly load source
        const source = (compiler as any).source as Source;

        // Parse
        console.time("parsing");
        const parser = new nearley.Parser(Grammar);
        parser.feed(source.content);
        console.timeEnd("parsing");

        if(parser.results.length > 1){
            console.error("! AMBIGUOUS GRAMMAR !");
            console.log(JSON.stringify(parser.results[0], null, 4));
            console.log(JSON.stringify(parser.results[1], null, 4));
            console.log(parser.results.length);

            // TODO: Remove this kludge
            throw new Error();
        }

        return parser.results[0];
    }
}

class AstGeneration {
    public execute(compiler: Compiler){
        const parse = new Parse();
        const results = parse.execute(compiler);

        // Ast Generation
        console.time("ast-generation");
        for(const node of results){
            compiler.parse(node, compiler.scope);
            // this.parse(node, this.scope);
        }
        console.timeEnd("ast-generation");

        removeIntrinsics(compiler);
    }
}

class TypeCheck {
    public execute(compiler: Compiler){
        const astGeneration = new AstGeneration();
        const scope = astGeneration.execute(compiler);

        // Type check
        console.time("type-checking");
        const checker = new TypeChecker(compiler);
        const state = new TypeChecker.State();
        for(const type of compiler.scope.typeNameMap.values()){
            checker.check(type, state);
            //type.checkTypes(this);
        }
        console.timeEnd("type-checking");

    }
}

class Analyze {
    public execute(compiler: Compiler){
        const typeCheck = new TypeCheck();
        typeCheck.execute(compiler);

        // Analysis
        console.time("analysis");
        const analyser = new Analyzer(compiler);
        const state = new Analyzer.State();
        for(const type of compiler.scope.typeNameMap.values()){
            analyser.check(type, state);
        }
        console.timeEnd("analysis");

    }
}

export class Monomorphize {
    public execute(compiler: Compiler){
        const analyze = new Analyze();
        analyze.execute(compiler);

        // Monomorphize
        console.time("monomorphize");
        const polymorpher = new Polymorpher(compiler, compiler.scope);
        const state = new Polymorpher.State();
        for(const type of compiler.scope.typeNameMap.values()){
            let morphed = polymorpher.polymorph(type, state);

            if(morphed.tag === Tag.Function){
                compiler.scope.typeNameMap.set(morphed.name, morphed);
                compiler.scope.functionNameMap.set(morphed.name, morphed);
            }
        }
        console.timeEnd("monomorphize");

    }
}

class CodeGen {
    public execute(compiler: Compiler){
        const monomorphize = new Monomorphize();
        monomorphize.execute(compiler);

        let output: string = "";

        // Code-gen
        console.time("code-gen");
        if(compiler.errors.length === 0){
            const target = new TargetCGcc();

            target.compileModule(compiler.scope);

            output = target.output.join("");
        }
        console.timeEnd("code-gen");

        return output;
    }
}


export class Compiler {
    // TODO: Refactor this out
    public readonly scope: Scope;
    public readonly types: {
        string: Type,
        int: Type,
        none: Type,
    };
    public readonly functions: {
        copy: Function,
        move: Function,
    };

    constructor(){
        this.scope = new Scope('F');
        const result = registerIntrinsics(this);
        this.types = result.types;
        this.functions = result.functions;
    }

    // TODO: Refactor actions so that this doesn't have to be public
    public errors = new Array<CompilerError>();

    public report(error: any) {
        this.errors.push(error);
    }

    public parse(node: any, scope: Scope): Thing{
        switch(node.tag){
            // Run the AST builders on each Nearley node
            // See: parser/ast_builders for the code that is actually run to build each AST Node
            // See: parser/post_processor for the code that wraps Nearley nodes with AST builders
            //      in particular the builder function.
            case AstTag.NODE: {
                return node.builder(node.data, this, scope);
            }

            // Ignore whitespace, this whitespace comes primarily from the whitespace between elements in statement lists.
            //  It should be removed much earlier in parsing, but we're waiting until we have a better idea how everything
            //  will pan out.
            case AstTag.WHITESPACE: {
                // TODO: Avoid subverting type system
                return undefined as any;
            }

            default: {
                throw new Error(`Unknown node tag: ${node.tag}`);
            }
        }
    }

    public compile(source: Source){
        (this as any).source = source;

        const codegen = new CodeGen();
        const output = codegen.execute(this);
        
        if(this.errors.length > 0){
            while(this.errors.length > 0){
                this.errors.pop()!.format(new ConsoleErrorFormatter(), this);
            }
            return null;
        }

        return output;
    }
};