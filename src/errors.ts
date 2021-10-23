import { Context, RefAny, RefFieldName, Type } from './nodes';

/**
 * In an indexing expression the field could not be found.
 * 
 *  Eg. In the expression 'foo.bar' we can not find 'bar'.
 *  - The expression is valid
 *  - We can determine the target expression 'foo'
 *  - We can determine the target expression's type
 *  - We can access the target expression's type
 *  - We just can't find 'bar' in it.
 * 
 * @see resolveNames.ts
 */
export class CantFindFieldError {
    public constructor(
        public context: Context,
        public reference: RefFieldName,
    ) { }
}

export class CantFindSymbolError {}

export class IncorrectTypeError {
    public constructor(
        public context: Context,
        public source: RefAny,
        public sourceType: Type,
        public destination: RefAny,
        public destinationType: Type,
        public assignment: RefAny,
    ) { }
}

/**
 * Code violates the rule that all variable declarations must either
 * - have an explicit type definition, the variable has the type explicitly defined
 * - have a value assigned to it at definition, the variable has the type of the value
 * - have the name 'self', the variable has the type of the surrounding Type (struct/trait/etc...)
 * 
 * If a variable does not follow this rule then we do not know what the type of the variable should be and throw an error.
 * 
 * @see resolveNames.ts
 */
export class ValueOrTypeError {
    public constructor(
        public context: Context,
        public variable: RefAny,
    ) { }
}

export namespace Lifetime {
    export class NotAliveError { }
    export class ReadWriteError { }
    export class WriteWriteError { }
}