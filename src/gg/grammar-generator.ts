import { Parser, Grammar } from 'nearley';
import * as moo from 'moo';
import { NearleyRule, NearleySymbol } from './nearley-types';

export type Definition<Config> =
    | Matcher<any, Config>
    | string
    | number
    | RegExp

// Get the type of the matcher
export type GetType<T> =
    T extends Matcher<infer U, any> ? U :
    T extends RegExp ? string :
    T;

export type GetTypes<T extends Definition<any>[]> = {
    [index in keyof T]: GetType<T[index]>
} & {
    length: T['length']
};

export abstract class Matcher<
    Match = any,
    Config = any
> {
    // Set during toParser
    private id = '';
    private _match!: Match;

    public readonly config!: Config;

    // public abstract getMatchers(): readonly Matcher[];

    public subrules: Matcher<any, any>[];
    public readonly usesBuilder: boolean;

    public constructor(definition: Definition<any>[], usesBuilder?: boolean) {
        this.subrules = definition.map(value => {
            if (typeof (value) === 'string') {
                return new Constant(value);
            }
            if (typeof (value) === 'number') {
                return new Constant(value.toString());
            }
            if (value instanceof RegExp) {
                return new Regex(value);
            }
            return value;
        });
        this.usesBuilder = usesBuilder ?? this.subrules.some(subrule => subrule.usesBuilder);
    }

    public abstract toNearleyRules(id: string): NearleyRule[]

    public toNearleySymbol(): NearleySymbol {
        return this.id;
    }

    static toParser<Match>(self: Rule<any, Match>) {
        const rules = new Set<Matcher>();
        const stack = new Array<Matcher>();

        // Collect all matchers
        rules.add(self);
        stack.push(self);
        while (stack.length > 0) {
            const rule = stack.pop()!;

            // Populate the definition
            if (rule instanceof Rule) {
                for (const definition of rule.definitions) {
                    const def = definition.definition();
                    rule.subrules = rule.subrules.concat(def.subrules);
                    definition.matchers = def.subrules;
                }
            }

            // Visit subrules
            for (const subrule of rule.subrules) {
                if (rules.has(subrule)) {
                    continue;
                }

                rules.add(subrule);
                stack.push(subrule);
            }
        }

        // Collect all unique string/regex
        const unique = new Map<string | RegExp, Matcher>();
        const remove = new Set<Matcher>();
        for (const rule of rules) {
            if (rule instanceof Constant) {
                if (unique.has(rule.value)) {
                    remove.add(rule);
                } else {
                    unique.set(rule.value, rule);
                }
            }
            if (rule instanceof Regex) {
                if (unique.has(rule.regex.toString())) {
                    remove.add(rule);
                } else {
                    unique.set(rule.regex.toString(), rule);
                }
            }
        }

        // Deduplicate
        for (const rule of remove) {
            rules.delete(rule);
        }
        for (const rule of rules) {
            for (let i = 0; i < rule.subrules.length; i++) {
                const subrule = rule.subrules[i];
                if (subrule instanceof Constant) {
                    rule.subrules[i] = unique.get(subrule.value)!;
                }
                if (subrule instanceof Regex) {
                    rule.subrules[i] = unique.get(subrule.regex.toString())!;
                }
            }
        }

        // Assign unique ids to all unnamed parameters
        let id = 0;
        for (const rule of rules) {
            if (rule.id === '') {
                rule.id = (id++).toString();
            }
        }

        console.log(rules);

        // Generate symbols
        const nearleyRules = [];
        for (const rule of rules) {
            for (const generated of rule.toNearleyRules(rule.id)) {
                nearleyRules.push(generated);
            }
        }

        // Create the lexer
        const lexerRules = {} as moo.Rules;
        for (const rule of rules) {
            if (rule instanceof Constant) {
                lexerRules[rule.value] = rule.value;
            }
            if (rule instanceof Regex) {
                lexerRules[rule.id] = rule.regex;
            }
        }

        console.log(lexerRules);

        // Create Nearley grammar
        const grammar = {
            Lexer: moo.compile(lexerRules),
            ParserRules: nearleyRules,
            ParserStart: self.id,
        };

        console.log(...nearleyRules);

        const parser = new Parserx<Match>(new Parser(grammar as any));
        return parser;
    }
}

interface Subrule<Context, Match extends any[], Result> {
    definition: () => Def<Match, any>,
    builder: (context: Context, ...args: Match) => Result
    matchers?: Matcher[],
}

export class Rule<Context, Result> extends Matcher<Result, true> {
    readonly definitions: Subrule<Context, any, Result>[];

    public constructor(
        readonly name: string
    ) {
        super([], true);
        this.definitions = [];
    }

    add<T extends any[]>(
        definition: () => Def<T, any>,
        builder: (ctx: Context, ...args: T) => Result
    ) {
        this.definitions.push({
            definition: definition,
            builder: builder,
        })
    }

    toParser(): Parserx<Result> {
        return Matcher.toParser(this);
    }

    toNearleyRules(id: string): NearleyRule[] {
        return this.definitions.map(definition => {
            return {
                name: id,
                symbols: definition.matchers!.map(subrule => subrule.toNearleySymbol()),
                postprocess: (data) => {
                    return {
                        build: (context: any) => {
                            return definition.builder(context, ...data as any);
                        }
                    }
                }
            };
        });
    }
}

export enum MatcherTag {
    Constant,
    Def,
    Either,
    List,
    Opt,
    Regex,
    Rule,
    Seq,
}

export class Constant extends Matcher<string, false> {
    constructor(
        readonly value: string,
    ) {
        super([]);
    }

    readonly tag = MatcherTag.Constant;

    public toNearleyRules(id: string): NearleyRule[] {
        return [{name: id, symbols: [{literal: this.value}], postprocess: (data) => data[0].value}]
    }
}

export class Def<Match extends any[], Config> extends Matcher<Match, Config> {
    readonly tag = MatcherTag.Def;

    public toNearleyRules(): NearleyRule[] {
        throw new Error('');
    }
}

/** "Either" - Match one of the elements in definition.
 */
export function either<D extends Definition<false>>(definition: D[]): Either<GetType<D>, false>
export function either<D extends Definition<any>>(definition: D[]): Either<GetType<D>, true>
export function either<D extends Definition<any>>(definition: D[]): Either<GetType<D>, any>
{
    return new Either(definition);
}
export class Either<Match, Config> extends Matcher<Match, Config> {
    readonly tag = MatcherTag.Either;

    public toNearleyRules(id: string): NearleyRule[] {
        return this.subrules.map(subrule => {
            return {
                name: id,
                symbols: [subrule.toNearleySymbol()],
                postprocess: (data) => data[0],
            }
        });
    }
}

/** "List" - Match definition repeatedly times.
 */
export function list<D extends Definition<false>>(definition: D): List<GetType<D>[], false>
export function list<D extends Definition<any>>(definition: D): List<GetType<D>[], true>
export function list<D extends Definition<any>>(definition: D): List<GetType<D>[], any>
{
    return new List([definition])
}
export class List<Match, Config> extends Matcher<Match, Config> {
    readonly tag = MatcherTag.List;

    public toNearleyRules(id: string): NearleyRule[] {
        return [];
    }
}

/** "Optional" - Optionally match definition. ie. Match `definition` or match nothing.
 */
export function opt<D extends Definition<false>>(definition: D): Opt<GetType<D> | null, false>
export function opt<D extends Definition<any>>(definition: D): Opt<GetType<D> | null, true>
export function opt<D extends Definition<any>>(definition: D): Opt<GetType<D> | null, any>
{
    return new Opt([definition])
}
export class Opt<Match, Config> extends Matcher<Match, Config> {
    readonly tag = MatcherTag.Opt;

    public toNearleyRules(id: string): NearleyRule[] {
        // If rules have the same name, Nearley can match all of them
        //  In this case we have a rule that matches the subrule and a rule that matches nothing
        return [
            { name: id, symbols: this.subrules.map(subrule => subrule.toNearleySymbol()), postprocess: (data) => data[0] },
            { name: id, symbols: [], postprocess: () => null },
        ]
    }
}

export class Regex extends Matcher<string, false> {
    readonly tag = MatcherTag.Regex;

    constructor(
        readonly regex: RegExp,
    ) {
        super([])
    }

    public toNearleyRules(id: string): NearleyRule[] {
        return [{ name: id, symbols: [{ type: id }], postprocess: (data) => data[0].value }]
    }
}

/** "Sequence" - Match each element in definition in order.
 */
export function seq<D extends Definition<false>[]>(...definition: D): Seq<GetTypes<D>, false>
export function seq<D extends Definition<any>[]>(...definition: D): Seq<GetTypes<D>, true>
export function seq<D extends Definition<any>[]>(...definition: D): Seq<GetTypes<D>, any>
{
    return new Seq(definition)
}
export class Seq<Match extends any[], Config> extends Matcher<Match, Config> {
    readonly tag = MatcherTag.Seq;

    public toNearleyRules(id: string): NearleyRule[] {
        return [{
            name: id,
            symbols: this.subrules.map(subrule => subrule.toNearleySymbol())
        }]
    }
}


export interface Matched<Match, Context> {
    build(ctx: Context): Match
}

export type GetBuilderParameter<T, Context> =
    T extends Matcher<infer U, false> ? U :
    T extends Matcher<infer U, true> ? Matched<U, Context> :
    string
    ;

export type GetBuilderParameters<T extends Definition<any>[], Context> = {
    [index in keyof T]: GetBuilderParameter<T[index], Context>
} & {
    length: T['length']
};

export function Rules<Context>() {
    function rule<U>(name: string): Rule<Context, U>
    function rule<T extends any[], U>(name: string, definition: () => Def<T, any>, builder: (ctx: Context, ...args: T) => U): Rule<Context, U>
    function rule<T extends any[], U>(name: string, definition?: () => Def<T, any>, builder?: (ctx: Context, ...args: T) => U): Rule<Context, U>
    {
        const rule = new Rule<Context, U>(name);

        if (definition !== undefined && builder !== undefined) {
            rule.add(definition, builder);
        }

        return rule;
    }

    function def<D extends Definition<any>[]>(...definition: D): Def<GetBuilderParameters<D, Context>, false>
    {
        return new Def(definition);
    }

    return { rule, def };
}

class Parserx<U> {
    constructor(
        private parser: Parser
    ) {
    }

    parse(context: any, input: string): U {
        this.parser.feed(input);
        this.parser.finish();
        return this.parser.results[0].build(context);
    }
}