import * as Nearley from 'nearley';
import * as moo from 'moo';
import { MooRule, NearleyGrammar, NearleyProcessor, NearleyRule, NearleySymbol } from './dependencies';
import { unreachable } from '../../utils';
import * as fs from 'fs'

export type Definition<Config = any> =
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

export type GetConfig<T> =
    T extends Definition<false> ? false :
    T extends Definition<false>[] ? false :
    true;

const child = (id: string, num: number) => `${id}$${num}`;

function RULE(name: string, symbols: Array<NearleySymbol | Matcher>, processor?: NearleyProcessor): NearleyRule {
    return {
        name: name,
        symbols: symbols.map(symbol => symbol instanceof Matcher ? symbol.toSymbol() : symbol),
        postprocess: processor,
    }
}

function PRE(matcher: Matcher, handler?: NearleyProcessor) {
    if (matcher.config === false) {
        return handler;
    }

    if (handler !== undefined) {
        return (data: any, location: any, reject: any) => {
            data = handler(data, location, reject)
            return data === reject ? reject : new Builder(matcher.getName(), data, UNWRAP)
        }
    }

    return (data: any) => new Builder(matcher.getName(), data, UNWRAP)
}

function POST(matcher: Matcher, handler?: (data: any) => any) {
    if (matcher.config === false) {
        return handler;
    }

    if (handler !== undefined) {
        return (data: any) => new Builder(matcher.getName(), data, (ctx, data) => handler(UNWRAP(ctx, data)))
    }

    return (data: any) => new Builder(matcher.getName(), data, UNWRAP)
}

function UNWRAP(ctx: any, data: any) {
    if (data instanceof Array) {
        return data.map(value => unwrap(ctx, value))
    }

    if (data instanceof Builder) {
        return data.build(ctx)
    }
    
    if (data instanceof Object) {
        const result = {} as any

        for (const name of Object.getOwnPropertyNames(data)) {
            result[name] = unwrap(ctx, data[name])
        }

        return result
    }

    return data
}

function unwrap(ctx: any, data: any): any {
    if (data instanceof Array) {
        return data.map(value => unwrap(ctx, value));
    }

    if (data instanceof Builder) {
        return data.build(ctx);
    }

    return data;
}

export abstract class Matcher<
    Match = any,
    Config = any
> {
    // Set during toParser
    private id = '<INVALID-ID>';
    private _match!: Match;

    public readonly config!: Config;

    // TODO: Make this abstract
    public getMatchers() {
        return this.subrules;
    }

    public subrules: Matcher<any, any>[];

    public constructor(definition: Definition<any>[], config?: Config) {
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
        this.config = (config as any) ?? this.subrules.some(subrule => subrule.config);
    }

    public abstract toRules(id: string): NearleyRule[]

    public toSymbol(): NearleySymbol {
        return this.id;
    }
    
    toToken(): MooRule {
        throw new Error('Not implemented');
    }

    getName() {
        return this.id;
    }

    toParser<Context>() {
        const rules = new Set<Matcher>();
        const stack = new Array<Matcher>();

        // Collect all matchers
        rules.add(this);
        stack.push(this);
        while (stack.length > 0) {
            const rule = stack.pop()!;

            // Populate the definition
            if (rule instanceof Rule) {
                for (const definition of rule.definitions) {
                    const def = typeof (definition.definition) === 'function' ?
                        definition.definition() :
                        definition.definition;
                    
                    const matcher = Matcher.from(def);

                    if (matcher instanceof Def) {
                        rule.subrules = rule.subrules.concat(matcher.subrules);
                        definition.matchers = matcher.subrules;
                    } else {
                        rule.subrules = rule.subrules.concat([matcher]);
                        definition.matchers = [matcher];
                    }
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
            if (rule instanceof Rule) {
                for (const definition of rule.definitions) {
                    definition.matchers = definition.matchers?.map(matcher => {
                        if (matcher instanceof Constant) {
                            return unique.get(matcher.value)!;
                        }
                        if (matcher instanceof Regex) {
                            return unique.get(matcher.regex.toString())!;
                        }
                        return matcher;
                    });
                }
            } else {
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
        }

        // Assign unique ids to all unnamed parameters
        let id = 0;
        for (const rule of rules) {
            rule.id = (id++).toString();
        }

        // Generate symbols
        const nearleyRules = [];
        for (const rule of rules) {
            for (const generated of rule.toRules(rule.id)) {
                nearleyRules.push(generated);
            }
        }

        // Collect lexer tokens
        const constants = [];
        const patterns = [];
        for (const rule of rules) {
            if (rule instanceof Constant) {
                constants.push({
                    id: rule.id,
                    matcher: rule.toToken()
                });
            }
            if (rule instanceof Regex) {
                patterns.push({
                    id: rule.id,
                    matcher: rule.toToken(),
                    keywords: new Array<any>(),
                });
            }
        }

        // Create the lexer
        const lexerRules = {} as moo.Rules;
        const ignore = new Set();

        for (const constant of constants) {
            for (const pattern of patterns) {
                if (pattern.matcher.test(constant.matcher)) {
                    pattern.keywords.push(constant);
                    ignore.add(constant);
                }
            }
        }

        for (const pattern of patterns) {
            if (pattern.keywords.length > 0) {
                const keywords = {} as any;
                for (const keyword of pattern.keywords) {
                    keywords[keyword.id] = keyword.matcher;
                }

                lexerRules[pattern.id] = {
                    match: pattern.matcher,
                    type: moo.keywords(keywords),
                };
            } else {
                lexerRules[pattern.id] = pattern.matcher;
            }
        }

        for (const constant of constants) {
            if (ignore.has(constant)) {
                continue;
            }

            if (constant.matcher === '\n') {
                lexerRules[constant.id] = {
                    match: constant.matcher,
                    lineBreaks: true,
                };
            } else {
                lexerRules[constant.id] = constant.matcher;
            }
        }

        // Create Nearley grammar
        const grammar = {
            Lexer: moo.compile(lexerRules),
            ParserRules: nearleyRules,
            ParserStart: this.id,
        };

        const parser = new Parser<Match, Context>(grammar);
        return parser;
    }

    public get<K extends keyof Match>(key: K): Matcher<Match[K], Config> {
        return get(this, key);
    }

    static from<D extends Definition>(definition: D): Matcher<GetType<D>, any> {
        switch (typeof definition) {
            case 'string': return new Constant(definition) as any;
            case 'number': return new Constant(definition.toString()) as any;
            case 'object': {
                if (definition instanceof RegExp) return new Regex(definition) as any;
                return definition as any;
            }
        }
        throw unreachable(definition as never);
    }
}

interface Subrule<Context, Match extends any[], Result> {
    name: string,
    definition: Definition | (() => Definition),
    builder: (context: Context, ...args: Match) => Result
    matchers?: Matcher[],
}

export class Rule<Context, Result> extends Matcher<Result, true> {
    readonly definitions: Subrule<Context, any, Result>[];

    public constructor() {
        super([], true);
        this.definitions = [];
    }

    add<D extends Definition>(definition: Matcher<Result>): void
    add<D extends Definition>(definition: D | (() => D), builder: (ctx: Context, ...args: GetProcessorParameters<D>) => Result, name?: string): void
    add<D extends Definition>(definition: D | (() => D), builder: (ctx: Context, ...args: GetProcessorParameters<D>) => Result = (ID as any), name: string = '<SUBRULE>') {
        this.definitions.push({
            name: name,
            definition: definition,
            builder: builder,
        })
    }

    toRules(id: string): NearleyRule[] {
        return this.definitions.map(definition =>
            RULE(id, definition.matchers!, data => new Builder(definition.name, data, (ctx, data) => definition.builder(ctx as any, ...data)))
        );
    }

    toParser<C = Context>() {
        return super.toParser<C>();
    }
}

export type GetProcessorParameters<D extends Definition> =
    D extends Def<infer M, any> ? M :
    D extends Matcher<infer M, false> ? [M] :
    D extends Matcher<infer M, true> ? [Builder<M, any>] :
    [string];

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

export function constant(value: string) {
    return new Constant(value);
}
export class Constant extends Matcher<string, false> {
    readonly tag = MatcherTag.Constant;

    constructor(readonly value: string) {
        super([]);
    }

    public toRules(id: string): NearleyRule[] {
        // Match literal value of token and return it.
        return [RULE(id, [{ literal: this.value }], data => data[0].value)]
    }

    public toToken() {
        return this.value;
    }
}

export class Def<Match extends any[], Config> extends Matcher<Match, Config> {
    readonly tag = MatcherTag.Def;

    public toRules(): NearleyRule[] {
        throw new Error('');
    }
}

/** "Either" - Match one of the elements in definition.
 */
export function either<D extends Definition>(definition: D[]): Either<GetType<D>, GetConfig<D>>
{
    return new Either(definition);
}
export class Either<Match, Config> extends Matcher<Match, Config> {
    readonly tag = MatcherTag.Either;

    public toRules(id: string): NearleyRule[] {
        return this.subrules.map(subrule =>
            RULE(id, [subrule], PRE(this, data => data[0]))
        );
    }
}

export function star<
    Start extends Definition,
    Space extends Definition,
    Element extends Definition,
    Separator extends Definition,
    End extends Definition,
>(
    start: Start,
    space: Space,
    element: Element,
    separator: Separator,
    end: End,
): Star<ListX<GetType<Start>, GetType<Space>, GetType<Element>, GetType<Separator>, GetType<End>>, GetConfig<[Start, Space, Element, Separator, End]>> {
    return new Star([start, space, element, separator, end]);
}
export class Star<Match extends ListX<any, any, any, any, any>, Config> extends Matcher<Match, Config> {
    public toRules(id: string): NearleyRule[] {
        const [start, space, element, separator, end] = this.subrules;

        const inside = child(id, 1);
        const elements = child(id, 2);

        return [
            RULE(elements, [element], data => ({
                elements: data,
                separators: []
            })),
            RULE(elements, [elements, separator, element], data => ({
                elements: data[0].elements.concat([data[2]]),
                separators: data[0].separators.concat([data[1]]),
            })),

            RULE(inside, [elements, space], data => ({
                elements: data[0].elements,
                separators: data[0].separators,
                endSpace: data[1],
            })),
            RULE(inside, [], data => ({
                elements: [],
                separators: [],
                endSpace: null,
            })),

            RULE(id, [start, space, inside, end], PRE(this, data => ({
                start: data[0],
                startSpace: data[1],
                elements: data[2].elements,
                separators: data[2].separators,
                endSpace: data[2].endSpace,
                end: data[3],
            }))),
        ];
    }

    get elements() {
        return get(this, 'elements')
    }
}

class ListX<Start, Space, Element, Separator, End> {
    constructor(
        readonly start: Start,
        readonly startSpace: Space,
        readonly elements: Element[],
        readonly separators: Separator[],
        readonly endSpace: Space,
        readonly end: End,
    ) { }
}

/** "List" - Match definition repeatedly times.
 */
export function list<Element extends Definition>(element: Element): List<MatchList4<GetType<Element>, undefined, undefined, undefined>, GetConfig<[Element]>>
export function list<Element extends Definition, Separator extends Definition>(element: Element, separator: Separator): List<MatchList4<GetType<Element>, GetType<Separator>, undefined, undefined>, GetConfig<[Element, Separator]>>
export function list<Element extends Definition, Separator extends Definition, Start extends Definition, End extends Definition>(element: Element, separator: Separator, start: Start, end: End): List<MatchList4<GetType<Element>, GetType<Separator>, GetType<Start>, GetType<End>>, GetConfig<[Element, Separator, Start, End]>>
export function list<Element extends Definition, Separator extends Definition, Start extends Definition, End extends Definition>(element: Element, separator: Separator, start: Start, end: End): any
export function list(element: any, separator?: any, start?: any, end?: any)
{
    if (separator && start) {
        return new List([
            Matcher.from(element),
            Matcher.from(separator),
            Matcher.from(start),
            Matcher.from(end)
        ]);
    } else if (separator) {
        return new List([
            Matcher.from(element),
            Matcher.from(separator),
        ]);
    } else {
        return new List([
            Matcher.from(element),
        ]);
    }
}

export class List<Match, Config> extends Matcher<Match, Config> {
    readonly tag = MatcherTag.List;

    public toRules(id: string): NearleyRule[] {
        switch (this.subrules.length) {
            // element
            case 1: {
                const [element] = this.subrules;

                return [
                    RULE(id, [element], data => ({
                        elements: data,
                    })),
                    RULE(id, [id, element], data => ({
                        elements: data[0].elements.concat([data[1]]),
                    })),
                ];
            }

            // element separator
            case 2: {
                const [element, separator] = this.subrules;

                if (this.config) {
                    const inner = child(id, 1);
                    return [
                        RULE(inner, [element], data => ({
                            elements: data,
                            separators: []
                        })),
                        RULE(inner, [inner, separator, element], data => ({
                            elements: data[0].elements.concat([data[2]]),
                            separators: data[0].separators.concat([data[1]]),
                        })),
                        RULE(id, [inner], data => new Builder(id, data, (ctx, data) => ({
                            elements: data[0].elements.map((value: any) => value instanceof Builder ? value.build(ctx) : value),
                            separators: data[0].separators.map((value: any) => value instanceof Builder ? value.build(ctx) : value),
                        }))),
                    ];
                }

                return [
                    RULE(id, [element], data => ({
                        elements: data,
                        separators: []
                    })),
                    RULE(id, [id, separator, element], data => ({
                        elements: data[0].elements.concat([data[2]]),
                        separators: data[0].separators.concat([data[1]]),
                    })),
                ];
            }

            // element separator start end
            case 4: {
                const inside = child(id, 1);
                const [element, separator, start, end] = this.subrules;

                return [
                    RULE(id, [start, inside, end], data => ({
                        elements: data[1].elements,
                        separators: data[1].separators,
                        start: data[0],
                        end: data[2],
                    })),
                    RULE(inside, [element], data => ({
                        elements: data,
                        separators: [],
                    })),
                    RULE(inside, [inside, separator, element], data => ({
                        elements: data[0].elements.concat([data[2]]),
                        separators: data[0].separators.concat([data[1]]),
                    })),
                ];
            }
                
            default: throw unreachable("List should have 1, 2, or 4 elements");
        }
    }
}
export interface MatchList4<Element, Separator, Start, End> {
    readonly elements: Element[];
    readonly separators: Separator[];
    readonly start: Start;
    readonly end: End;
}

/** "Optional" - Optionally match definition. ie. Match `definition` or match nothing.
 */
export function opt<D extends Definition>(definition: D): Opt<GetType<D> | null, GetConfig<D>>
{
    return new Opt([definition])
}

export class Opt<Match, Config> extends Matcher<Match, Config> {
    readonly tag = MatcherTag.Opt;

    public toRules(id: string): NearleyRule[] {
        // If rules have the same name, Nearley can match all of them
        //  In this case we have a rule that matches the subrule and a rule that matches nothing
        return [
            RULE(id, this.subrules, PRE(this, data => data[0])),
            RULE(id, [], PRE(this, data => null)),
        ]
    }
}

export function regex(value: RegExp) {
    return new Regex(value);
}
export class Regex extends Matcher<string, false> {
    readonly tag = MatcherTag.Regex;

    constructor(readonly regex: RegExp) {
        super([])
    }

    public toRules(id: string): NearleyRule[] {
        return [RULE(id, [{ type: id }], data => data[0].value)]
    }

    public toToken() {
        return this.regex;
    }
}

/** "Sequence" - Match each element in definition in order.
 */
export function seq<D extends Definition[]>(...definition: D): Seq<GetTypes<D>, GetConfig<D>>
{
    return new Seq(definition);
}
export class Seq<Match extends any[], Config> extends Matcher<Match, Config> {
    readonly tag = MatcherTag.Seq;

    public toRules(id: string): NearleyRule[] {
        return [RULE(id, this.subrules, PRE(this))]
    }
}

export function get<Match, Config, Key extends keyof Match>(matcher: Matcher<Match, Config>, key: Key): Get<Match[Key], Config> {
    return new Get([matcher], key);
}
export class Get<Match, Config> extends Matcher<Match, Config> {
    public constructor(
        definition: Definition[],
        readonly key: any,
    ) {
        super(definition);
    }

    public toRules(id: string): NearleyRule[] {
        return [
            RULE(id, this.subrules, POST(this, data => data[0]?.[this.key] ?? null))
        ]
    }
}

const ID = (ctx: any, ...data: any[]) => data.map(arg => arg instanceof Builder ? arg.build(ctx) : arg)[0]

export class Builder<Result, Context> {
    public constructor(
        readonly name: string,
        readonly data: any,
        readonly processor: (ctx: Context, data: any) => Result
    ) {
    }

    build(ctx: Context): Result {
        return this.processor(ctx, this.data);
    }
}

export type GetBuilderParameter<T, Context> =
    T extends Matcher<infer U, false> ? U :
    T extends Matcher<infer U, true> ? Builder<U, Context> :
    string
    ;

export type GetBuilderParameters<T extends Definition<any>[], Context> = {
    [index in keyof T]: GetBuilderParameter<T[index], Context>
} & {
    length: T['length']
};

export function Rules<Context>() {
    function rule<Result>(): Rule<Context, Result>
    //function rule<D extends Definition>(definition: D | (() => D)): Rule<Context, GetType<D>>
    function rule<D extends Definition, Result>(definition: D | (() => D), builder: (ctx: Context, ...args: GetProcessorParameters<D>) => Result, name?: string): Rule<Context, Result>
    function rule<T extends any[], Result>(definition?: () => Def<T, any>, builder?: (ctx: Context, ...args: T) => Result, name: string = '<SUBRULE>'): Rule<Context, Result>
    {
        const rule = new Rule<Context, Result>();

        if (definition !== undefined && builder !== undefined) {
            rule.add(definition, builder, name);
        }

        return rule;
    }

    function def<D extends Definition<any>[]>(...definition: D): Def<GetBuilderParameters<D, Context>, false>
    {
        return new Def(definition);
    }

    return { rule, def };
}

class Parser<Match, Context> {
    constructor(
        private readonly grammar: NearleyGrammar
    ) {
    }

    parse(context: Context, input: string): Match {
        const parser = new Nearley.Parser(this.grammar as any);

        parser.feed(input);
        parser.finish();

        if (parser.results.length === 0) {
            throw new Error('Incomplete Parse')
        }
        if (parser.results.length > 1) {
            for (let n = 0; n < parser.results.length; n++) {
                const result = compact(parser.results[n])
                const json = JSON.stringify(result, undefined, 4)
                fs.writeFileSync(`ambiguous-${n}`, json);
            }

            console.log();
            throw new Error('Ambiguous Parse')
        }

        const result = parser.results[0];
        if (result && result.build) {
            return result.build(context);
        } else {
            return result;
        }
    }
}

function compact(value: any): any {
    if (value instanceof Array) {
        return value.map(compact)
    }

    if (value instanceof Builder) {
        return {
            name: value.name,
            value: compact(value.data),
        }
    }

    if (value instanceof Object) {
        const result = {} as any

        for (const name of Object.getOwnPropertyNames(value)) {
            result[name] = compact(value[name])
        }

        return result
    }

    return value
}