/**
 * A type-safe parser generator.
 * - Uses moo as the tokenizer, and nearley.js as the parser.
 */
// TODO: Cleanup use of Result & unpack in the various rules
import moo from 'moo'
import { Parser as NearleyParser } from 'nearley'
import { Constructor } from '../common/constructor'
import { cached } from '../common/decorators'
import { PartialNull, TupleToVariant } from '../common/type-level-utils'
import { NearleyRule, NearleySymbol, NearleyProcessor, NearleyGrammar } from './nearley'

let id = 0
export abstract class Rule<Type = any, Named = any> {
    readonly id: string

    constructor() {
        this.id = (++id).toString()
    }

    abstract get children(): ReadonlyArray<Rule>
    abstract get names(): ReadonlyArray<string>
    abstract toRules(): NearleyRule[]

    // Type and Named are unused in the class and if we don't use them TypeScript's structural type system will
    //  consider `Rule<X>` and `Rule<Y>` to be the same type.
    private __type!: Type
    private __named!: Named
}

export class Result {
    constructor(
        private value: any,
        private unpack: (context: any, value: any) => ({ value: any }),
    ) { }

    build(context: any) {
        return this.unpack(context, this.value)
    }

    static value(value: any) {
        return new Result(value, (_, value) => ({ value }))
    }
}

export class Syntax<Context = any, Type = any, Name extends string = any> extends Rule<Type, {[name in Name]: Type}> {
    private definitions = new Array<SyntaxMatchDefinition>()
    private rules = new Array<Rule>()

    constructor(
        readonly name: Name,
        readonly config: Config<Context, Type>,
    ) {
        super()
    }

    match(definition: () => Rule<Type>): void
    match(definition: () => (Type extends string ? string | RegExp | number : never)): void
    match<D extends Def>(definition: () => D, transform: Transformer<D, Context, Type>): void
    match(definition: { definition: () => Rule<Type> }): void
    match(definition: { definition: () => (Type extends string ? string | RegExp | number : never) }): void
    match<D extends Def>(definition: { definition: () => D, transform: Transformer<D, Context, Type> }): void

    match(definition: any, transform?: any) {
        // To allow out-of-order definitions, we don't instantiate the subrules here, instead we instantiate them in
        //  `populate` when we need them.
        if (definition instanceof Function) {
            this.definitions.push({ definition, transform })
        } else {
            this.definitions.push(definition)
        }
    }

    private populate() {
        for (let i = this.rules.length; i < this.definitions.length; i++) {
            const definition = this.definitions[i].definition()
            this.rules.push(toRule(definition))
        }
    }

    get children(): ReadonlyArray<Rule<any>> {
        this.populate()
        return this.rules
    }

    get names(): ReadonlyArray<string> {
        return [this.name]
    }

    toRules(): NearleyRule[] {
        this.populate()

        return this.rules.map((subrule, index) => {
            const transform = this.definitions[index].transform

            const unpack = (context: any, result: Result) => {
                let value = result.build(context)
                value = transform === undefined ? value.value : transform(Object.assign({}, value, { context }))
                return { [this.name]: value, value: value }
            }

            return RULE(this.id, [subrule], data => new Result(data[0], unpack))
        })
    }
}

// Match a sequence of rules.
//  E.g. SEQ('a', 'b', 'c') matches 'abc'.
export function SEQ<D extends Def[]>(...definition: D) {
    return new SeqRule<D>(definition)
}
export class SeqRule<D extends Def[]> extends Rule<GetTypes<D>, GetNames<D>> {
    readonly definition: D
    readonly rules: ReadonlyArray<Rule>

    constructor(definition: D) {
        super()

        this.definition = definition
        this.rules = definition.map(toRule)
    }

    get children() {
        return this.rules
    }

    get names(): ReadonlyArray<string> {
        return this.rules.flatMap(rule => rule.names)
    }

    toRules(): NearleyRule[] {
        const unpack = (context: any, results: Result[]) => {
            const values = results.map(result => result.build(context))
            const value = values.map(value => value.value)
            return Object.assign({}, ...values, { value })
        }

        return [
            RULE(this.id, this.rules, data => new Result(data, unpack))
        ]
    }
}

// Optionally match a sequence of rules.
//  E.g. OPT('a', 'b', 'c') matches 'abc', or nothing.
export function OPT<D extends Def[]>(...definition: D) {
    return new OptRule(definition)
}
export class OptRule<D extends ReadonlyArray<Def>> extends Rule<
    D extends [infer U extends Def] ? GetType<U> | null : GetTypes<D> | null,
    PartialNull<GetNames<D>>
> {
    readonly definition: D
    readonly rules: ReadonlyArray<Rule>

    constructor(definition: D) {
        super()

        this.definition = definition
        this.rules = definition.map(toRule)
    }

    get children() {
        return this.rules
    }

    @cached
    get names(): ReadonlyArray<string> {
        return this.rules.flatMap(rule => rule.names)
    }

    toRules(): NearleyRule[] {
        const unpack = (context: any, results: Result[]) => {
            if (results.length === 1) {
                return results[0].build(context)
            } else {
                const values = results.map(result => result.build(context))
                const value = values.map(value => value.value)
                return Object.assign({}, ...values, { value })
            }
        }

        const NULL = NullArgs(this.names)
        NULL.value = null

        return [
            RULE(this.id, this.rules, data => new Result(data, unpack)),
            RULE(this.id, [], data => new Result(NULL, (_, value) => value)),
        ]
    }
}

// Match one of a set of rules.
//  E.g. ANY(['a', 'b', 'c']) matches 'a', 'b', or 'c'.
export function ANY<D extends Def[]>(...options: D) {
    return new AnyRule<D>(options)
}
export class AnyRule<D extends ReadonlyArray<Def>> extends Rule<
    TupleToVariant<GetTypes<D>>,
    PartialNull<GetNames<D>>
> {
    readonly definition: D
    readonly rules: ReadonlyArray<Rule>

    constructor(definition: D) {
        super()

        this.definition = definition
        this.rules = definition.map(toRule)
    }

    get children() {
        return this.rules
    }

    @cached
    get names(): ReadonlyArray<string> {
        return this.rules.flatMap(rule => rule.names)
    }

    toRules(): NearleyRule[] {
        const unpack = (context: any, result: Result) => {
            const value = result.build(context)
            return Object.assign({}, NULL, value)
        }

        const NULL = NullArgs(this.names)

        return this.rules.map(option => RULE(this.id, [option], (data) => new Result(data[0], unpack)))
    }
}

// Repeatedly match a rule.
//  E.g. REP('a') matches 'a', 'aa', 'aaa', etc.
export function REP<D extends Def[]>(...definition: D) {
    return new RepRule(definition)
}
export class RepRule<D extends ReadonlyArray<Def>> extends Rule<
    D extends [infer U extends Def] ? GetType<U>[] : GetTypes<D>[],
    ArrayifyFields<GetNames<D>>
> {
    readonly definition: D
    readonly rules: ReadonlyArray<Rule>

    constructor(definition: D) {
        super()

        this.definition = definition
        this.rules = definition.map(toRule)
    }

    get children() {
        return this.rules
    }

    @cached
    get names(): ReadonlyArray<string> {
        return this.rules.flatMap(rule => rule.names)
    }

    toRules(): NearleyRule[] {
        const elements = `${this.id}$1`
        const element = `${this.id}$2`

        const unpack = (context: any, results: Result[][]) => {
            const values = results.map(results => results.map(result => result.build(context)))
            const vs = values.map(values => values.length === 1 ? values[0].value : values.map(values => values.value))

            const x = values.map(values => Object.assign({}, ...values))
            const y: any = {}
            for (const name of this.names) {
                y[name] = x.map(x => x[name])
            }
            y.value = vs

            return y
        }

        return [
            RULE(this.id, [elements], (data) => new Result(data[0], unpack)),

            RULE(elements, [element]),
            RULE(elements, [elements, element], (data) => [...data[0], data[1]]),

            RULE(element, this.rules),
        ]
    }
}

type ArrayifyFields<T> = {[K in keyof T]: T[K][]}

// Matches a delimited list of elements.
//  Whitespace refers to the whitespace between the elements and the start and end of the list.
//  E.g. LIST('(', ' ', 'a', ', ', ')') matches '( a, a, a )'.
export function LIST<Whitespace extends Def, Element extends Def, Separator extends Def>(whitespace: Whitespace, element: Element, separator: Separator): ListRule<null, Whitespace, Element, Separator, null>
export function LIST<Start extends Def, Whitespace extends Def, Element extends Def, Separator extends Def, End extends Def>(start: Start, whitespace: Whitespace, element: Element, separator: Separator, end: End): ListRule<Start, Whitespace, Element, Separator, End>
export function LIST(...args: any[]): any
{
    switch (args.length) {
        case 3: {
            const [whitespace, element, separator] = args
            return new ListRule(null, whitespace, element, separator, null)
        }
        case 5: {
            const [start, whitespace, element, separator, end] = args
            return new ListRule(start, whitespace, element, separator, end)
        }
        default: {
            throw new Error('LIST given an incorrect number of arguments')
        }
    }
}

export class ListRule<
    Start      extends Def | null,
    Whitespace extends Def,
    Element    extends Def,
    Separator  extends Def,
    End        extends Def | null,
> extends Rule<List<
    Start extends Def ? GetType<Start> : null,
    GetType<Whitespace>,
    GetType<Element>,
    GetType<Separator>,
    End extends Def ? GetType<End> : null
>, unknown> {
    constructor(
        start:      Start,
        whitespace: Whitespace,
        element:    Element,
        separator:  Separator,
        end:        End,
    ) {
        super()

        if ((start === null) !== (end === null)) {
            throw new Error('`start` and `end` must both be null or both be non-null')
        }

        this.start = (start === null ? null : toRule(start)) as any
        this.whitespace = toRule(whitespace)
        this.element = toRule(element)
        this.separator = toRule(separator)
        this.end = (end === null ? null : toRule(end)) as any
    }

    readonly start: Start extends Def ? Rule<GetType<Start>> : null
    readonly whitespace: Rule<GetType<Whitespace>>
    readonly element: Rule<GetType<Element>>
    readonly separator: Rule<GetType<Separator>>
    readonly end: End extends Def ? Rule<GetType<End>> : null

    get children() {
        if (this.start !== null && this.end !== null) {
            return [this.start, this.whitespace, this.element, this.separator, this.end]
        } else {
            return [this.whitespace, this.element, this.separator]
        }
    }

    get names(): ReadonlyArray<string> {
        return []
    }

    toRules(): NearleyRule[] {
        const list = `${this.id}$1`
        const contents = `${this.id}$2`
        const elements = `${this.id}$3`

        return [
            RULE(this.id, [list], data => new Result(data[0], (context, value) => {
                let start: any
                let startWs: any
                let inside: any
                let end: any

                if (value.length === 2) {
                    [startWs, inside] = value
                    start = null
                    end = null
                } else {
                    [start, startWs, inside, end] = value
                }

                const elements: any[] = []
                const separators: any[] = []

                let contents = inside[0]
                if (contents !== undefined) {
                    while (contents.length === 3) {
                        elements.push(contents[2].build(context).value)
                        separators.push(contents[1].build(context).value)
                        contents = contents[0]
                    }

                    elements.push(contents[0].build(context).value)

                    elements.reverse()
                    separators.reverse()
                }

                const output = {
                    start: start === null ? null : start.build(context),
                    startWs: startWs.build(context),
                    elements: elements,
                    separators: separators,
                    endWs: inside[1] === undefined ? null : inside[1].build(context),
                    end: end === null ? null : end.build(context),
                }

                return { value: output }
            })),

            this.start !== null && this.end !== null ?
                RULE(list, [this.start, this.whitespace, contents, this.end]) :
                RULE(list, [this.whitespace, contents]),

            RULE(contents, []),
            RULE(contents, [elements, this.whitespace]),

            RULE(elements, [this.element]),
            RULE(elements, [elements, this.separator, this.element]),
        ]
    }
}

export interface List<Start, Whitespace, Element, Separator, End> {
    start: Start
    whitespace: Whitespace
    elements: Element[]
    separators: Separator[]
    end: End
}

export function TOKEN(name: string) {
    return new TokenRule(name)
}
export class TokenRule extends Rule<string> {
    constructor(readonly name: string) { super() }

    get children() {
        return []
    }

    get names(): ReadonlyArray<string> {
        return []
    }

    toRules() {
        return [RULE(this.id, [{ type: this.name }], data => Result.value(data[0].value))]
    }

    toToken() {
        return this.name
    }
}

export class ConstantRule extends Rule<string> {
    constructor(readonly value: string) { super() }

    get children() {
        return []
    }

    get names(): ReadonlyArray<string> {
        return []
    }

    toRules() {
        return [RULE(this.id, [{ literal: this.value }], data => Result.value(data[0].value))]
    }

    toToken() {
        return this.value
    }
}

export class RegexRule extends Rule<string> {
    constructor(readonly value: RegExp) { super() }

    get children() {
        return []
    }

    get names(): ReadonlyArray<string> {
        return []
    }

    toRules() {
        return [
            RULE(this.id, [{ type: this.value.toString() }], data => Result.value(data[0].value))
        ]
    }

    toToken() {
        return this.value
    }
}

// Convert a definition into a rule
function toRule<D extends Def>(definition: D): Rule<GetType<D>> {
    switch (typeof definition) {
        case 'number': return new ConstantRule(definition.toString()) as any
        case 'string': return new ConstantRule(definition) as any
        case 'object': {
            if (definition instanceof RegExp) {
                return new RegexRule(definition) as any
            }

            return definition
        }
        default: throw new Error(`Unexpected definition type: ${typeof definition}`)
    }
}

// =====================================================================================================================
function RULE(name: string, symbols: ReadonlyArray<NearleySymbol | Rule<any>>, processor?: NearleyProcessor): NearleyRule {
    return {
        name: name,
        symbols: symbols.map((symbol) => symbol instanceof Rule ? symbol.id : symbol),
        postprocess: processor,
    }
}

function NullArgs(names: ReadonlyArray<string>) {
    const NULL = {} as {[name: string]: null}

    for (const name of names) {
        NULL[name] = null
    }

    return NULL
}

interface SyntaxMatchDefinition {
    definition: () => Def
    transform: (results: any) => any
}

export type Def =
    | Rule<any>
    | number
    | RegExp
    | string

export type GetType<D extends Def> =
    D extends Rule<infer T> ? T :
    D extends string ? D :
    string

export type GetTypes<T extends ReadonlyArray<Def>> =
    T extends [infer D extends Def, ...infer Rest extends Def[]] ? [GetType<D>, ...GetTypes<Rest>] :
    []

export type GetName<T extends Def> =
    T extends Rule<any, infer U> ? U :
    {} 

export type GetNames<T extends ReadonlyArray<Def>> =
    T extends [infer D extends Def, ...infer Rest extends Def[]] ? GetName<D> & GetNames<Rest> :
    {}

// =====================================================================================================================
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface Config<Context, Type> {
    <T>(): Config<Context, T>
    <T>(constructor: Constructor<T>): Config<Context, T>
}

export class Config<Context, Type> {
    private constructor() { }

    readonly any = this as Config<Context, any>

    TOKENS?: TokenizerStates

    SYNTAX<Name extends string, D extends Def, Type>(definition: {
        name: Name,
        definition: () => D,
        transform: Transformer<D, Context, Type>,
    }) {
        const syntax = new Syntax<Context, Type, Name>(definition.name, undefined as any)
        syntax.match(definition.definition as any, definition.transform as any)
        return syntax
    }

    // Context and Type are unused in the type and if we don't use them TypeScript's structural type system will
    //  consider `Config<X>` and `Config<Y>` to be the same type.
    private __context!: Context
    private __type!: Type
}

export function CONFIG<Context>(): Config<Context, unknown> {
    const call = () => proxy
    const config = new (Config as any)()

    const proxy = new Proxy(call, {
        get(target, property, receiver) {
            return config[property]
        },
    
        set(target, property, value, receiver) {
            config[property] = value
            return true
        },
    })

    return proxy as any
}

interface TokenizerStates {
    [name: string]: TokenizerRule[]
}

interface TokenizerRule {
    match: string | RegExp
    push?: string
    pop?: 1
    token?: string
    lineBreaks?: boolean
}

export type Transformer<D extends Def, Context = any, Result = any> =
    (result: {context: Context, value: GetType<D> } & GetName<D> ) => Result

// =====================================================================================================================
export namespace Utils {
    export function addToMap<T>(map: Map<string, T[]>, key: string, value: T) {
        const values = map.get(key)

        if (values === undefined) {
            map.set(key, [value])
        } else {
            values.push(value)
        }
    }

    export function getAllChildren(rule: Rule) {
        const stack = [rule]
        const seen = new Set<Rule>([rule])

        while (stack.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const rule = stack.pop()!

            for (const child of rule.children) {
                if (seen.has(child)) {
                    continue
                }

                stack.push(child)
                seen.add(child)
            }
        }

        return Array.from(seen)
    }

    export function getTokens(rules: ReadonlyArray<Rule>): Tokens {
        // The previous version of this generator deduplicated Constant and Regex rules
        //  just haven't got around to doing it in this codebase
        const constants = new Map<string, ConstantRule[]>()
        const patterns = new Map<string, RegexRule[]>()

        for (const rule of rules) {
            if (rule instanceof RegexRule) {
                addToMap(patterns, rule.value.toString(), rule)
            } else if (rule instanceof ConstantRule) {
                addToMap(constants, rule.value.toString(), rule)
            }
        }

        return { constants, patterns }
    }

    export interface Tokens {
        constants: Map<string, ConstantRule[]>
        patterns: Map<string, RegexRule[]>
    }

    export function compileTokenizer(tokens: Tokens, config: Config<any, any>) {
        const states: {[name: string]: moo.Rules} = {}
        const main = {} as moo.Rules
        
        if (config.TOKENS !== undefined) {
            for (const [state, definitions] of Object.entries(config.TOKENS)) {
                const rules: moo.Rules = {}

                for (const definition of definitions) {
                    rules[definition.token ?? definition.match.toString()] = definition
                }

                states[state] = rules
            }
        }

        const patterns = Array.from(tokens.patterns.values()).map(pattern => ({
            match: pattern[0].toToken(),
            keywords: {} as any
        }))

        // If we naively compile constants and patterns into a tokenizer then we will run into the following problem.
        //  If we parse "structured", the tokenizer will match the "struct" keyword and match "ured" as an identifier.
        //  What we actually want is for "structured" to match as a single token.
        //
        // If we compile the pattern first then "struct" will always get matched as an identifier, not a keyword!
        //
        // Moo has a mechanism that we can use to solve this (moo.keywords), but we need to tell it which keywords
        //  can be matched from patterns.
        for (const constant of tokens.constants.keys()) {
            const matched = patterns.filter(pattern => pattern.match.test(constant))

            if (matched.length > 0) {
                for (const pattern of matched) {
                    pattern.keywords[constant] = constant
                }
            } else {
                main[constant] = {
                    match: constant,
                    lineBreaks: constant === '\n',
                }
            }
        }

        for (const pattern of patterns) {
            main[pattern.match.toString()] = {
                match: pattern.match,
                type: moo.keywords(pattern.keywords),
                keywords: pattern.keywords,
            } as any
        }

        if (states.main === undefined) {
            states.main = main
        } else {
            const output = {} as moo.Rules

            // The order of rules is important as it affects how the tokenizer processes the input.
            // For each token we use the following order:
            //  - order of tokens in CONFIG.TOKENS
            //  - order of constants and patterns in the grammar
            for (const [name, rule] of Object.entries(states.main)) {
                output[name] = rule
            }

            for (const [name, rule] of Object.entries(main)) {
                output[name] = Object.assign(output[name] || {}, rule)
            }

            states.main = output
        }

        return moo.states(states, 'main')
    }
}

export class Parser<Context, T> {
    private constructor(
        private readonly grammar: NearleyGrammar,
    ) { }

    parse(context: Context, content: string): T {
        const parser = new NearleyParser(this.grammar as any)
            
        Object.assign(parser, {
            reportError(token: any) {
                return `Invalid syntax, unexpected "${token.text}"`
            },

            reportLexerError() {
                return `Invalid syntax`
            },
        })

        parser.feed(content)
        
        switch (parser.results.length) {
            default: throw new Error('Ambiguous parse')
            case 0: throw new Error('Incomplete parse')
            case 1: return parser.results[0].build(context).value
        }
    }

    static create<Context, T>(syntax: Syntax<Context, T>) {
        const root = toRule(syntax)

        const rules = Utils.getAllChildren(root)
        const tokens = Utils.getTokens(rules)

        return new Parser<Context, T>({
            Lexer: Utils.compileTokenizer(tokens, syntax.config),
            ParserStart: root.id,
            ParserRules: rules.map(rule => rule.toRules()).flat(),
        })
    }

    static parse<Context, Type>(definition: Syntax<Context, Type>, content: string, context: Context): Type {
        return this.create(definition).parse(context, content)
    }
}