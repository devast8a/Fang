import * as Ast from './ast';
import { Compiler } from './compile';
import chalk from 'chalk';
import { Source } from './common/source';
import LineMap from './common/linemap';

type Node = any;

// 
export class CompilerError {
    public format(formatter: ErrorFormatter, compiler: Compiler){
    }
}

export class MissingImplementationError extends CompilerError {
    public constructor(child: Ast.Class, parent: Ast.Trait){
        super();
    }
}

export class ExpressionTypeError extends CompilerError {
    public constructor(target: any, type: Ast.Type, source: Ast.Expr){
        super();
    }
}

export class MissingIdentifierError extends CompilerError {
    public readonly identifier: Node;
    public readonly scope: Ast.Scope;

    public constructor(identifier: Node, scope: Ast.Scope){
        super();

        this.identifier = identifier;
        this.scope = scope;
    }

    public format(formatter: ErrorFormatter, compiler: Compiler){
        // HACK: Deliver source to other stages correctly
        const source = (compiler as any).source;

        formatter.format({
            message: "$0 does not exist, did you mean $1",
            position: this.identifier,
            source: source,
            arguments: [
                {value: this.identifier.value},
                {value: this.identifier.value, scope: this.scope}
            ],
            highlights: [
                {
                    source: source,
                    nodes: [this.identifier]
                }
            ],
        });
    }
}

export class NotTraitError extends CompilerError {
    public constructor(trait: Node){
        super();
    }
}

export class TraitImplementingTraitError extends CompilerError {
    public constructor(trait: Node){
        super();
    }
}

export class BadArgumentCountError extends CompilerError {
    public constructor(func: Node){
        super();
    }
}

export class LoanViolationError extends CompilerError {
    public constructor(){
        super();
    }
}

function levenshteinDistance(a: string, b: string){
    return levenshteinDistance_(a, b, a.length, b.length);
}

function levenshteinDistance_(a: string, b: string, i: number, j: number): number {
    // TODO: Optimize this function
    if(Math.min(i, j) === 0){
        return Math.max(i, j);
    }

    return Math.min(
        levenshteinDistance_(a, b, i - 1, j) + 1,
        levenshteinDistance_(a, b, i, j - 1) + 1,
        levenshteinDistance_(a, b, i - 1, j - 1) + (a.charAt(i) === b.charAt(j) ? 0 : 1),
    );
}

export interface ErrorFormat {
    message: string,
    source: Source,
    position: LineMap.Query,

    arguments?: Array<{
        value: string,
        scope?: Ast.Scope,
    }>;
    highlights?: Array<{
        nodes: Array<Node>,
        source: Source
    }>;
}

export interface ErrorFormatter {
    format(error: ErrorFormat): void;
}

export class ConsoleErrorFormatter implements ErrorFormatter {
    private source: Source;

    public constructor(source: Source){
        this.source = source;
    }

    public format(error: ErrorFormat): void {
        const args = error.arguments === undefined ? [] : error.arguments.map(x => this.formatArgument(x))
        const map = error.source.map;
        const entry = map.queryToLineColumn(error.position);

        // Color each of the first line components
        const banner  = chalk.bgRedBright.whiteBright('!');
        const path    = chalk.blueBright(error.source.path);
        const line    = chalk.greenBright(entry.line + 1);
        const column  = chalk.greenBright(entry.column + 1);
        const message = error.message.replace(/\$(\d+)/g, (_: any, index: number)=> chalk.whiteBright(`'${args[index]}'`));

        // First line
        console.log(`${banner} ${message} (${path}:${line}:${column})`);
        console.log();

        // Highlights
        if(error.highlights !== undefined){
            for(const highlight of error.highlights){
                this.highlight(highlight.nodes[0], highlight.source);
            }
        }
    }

    formatArgument(argument: { value: string; scope?: Ast.Scope; }): string {
        if(argument.scope !== undefined){
            let recommended = "";
            let min = argument.value.length;

            let scope: Ast.Scope | null = argument.scope;

            while(scope !== null){
                for(const symbol of scope.types.keys()){
                    const distance = levenshteinDistance(argument.value, symbol);
                    if(distance < min){
                        recommended = symbol;
                        min = distance;
                    }
                }

                scope = scope.parent;
            }

            return recommended;
        }
        return argument.value;
    }

    public highlight(identifier: Node, source: Source){
        const start = Math.max(0, identifier.line - 3);
        const end   = identifier.line;

        let lines = [];
        for(let line = start; line < end; line++){
            let content = source.map.lineToContent(line);

            if(line === identifier.line - 1){
                const col = identifier.col - 1;
                content = content.slice(0, col) +
                    chalk.redBright(content.slice(col, col + identifier.text.length)) +
                    content.slice(col + identifier.text.length);
            }

            lines.push(content);
        }

        // Remove common whitespace at the beginning
        const common = Math.min(...lines.map(x => /^\s*/.exec(x)![0].length));
        lines = lines.map(x => x.slice(common));

        // How long is the last line number
        const endLength = end.toString().length;

        // Print out everything
        for(let i = 0; i < lines.length; i++){
            let line = (i + start).toString();
            line = line.length < endLength ? " " + line : line;

            if(i + start === identifier.line - 1){
                console.log(chalk.red(line) + chalk.blackBright(`| `) + lines[i]);
            } else {
                console.log(chalk.blackBright(`${line}| `) + lines[i]);
            }
        }
    }
}
