// TypeScript's structural type system considers types to be equivalent if their structurs are equivalent.
// Since Ref's don't use their generic type parameter in their structure, Ref<Foo> is structurally equivalent to
//    Ref<Bar> and TypeScript considers them to be the same type.
//
// We don't want this behaviour, so we add a private field to Ref that "uses" adds the generic type parameter into the
//    structure of Ref. This way, Ref<Foo> and Ref<Bar> are not structurally equivalent and are considered to be
//    different types by TypeScript.
//
// We add `private type: RefType<T>` to each Ref type.
// - We use the type `RefType<T>` (rather than T by itself) to act as a bookmark to direct readers to this explanation
// - We use `T` (aliased through `RefType<T>`) to ensure that the structure of `Ref<T>` is different for each `T`
// - We use `T | undefined` to avoid initializing the field - The field only has an effect at the type level
//
// [1]: https://github.com/Microsoft/TypeScript/wiki/FAQ#generics
// [2]: https://www.typescriptlang.org/tsconfig/strictPropertyInitialization.html
type RefType<T> = T | undefined;