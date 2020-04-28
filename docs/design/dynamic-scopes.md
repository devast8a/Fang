# Dynamic Scoping

### Bike-shedding welcome for
- This document
- The syntax

### TODO
- How does this work during dynamic dispatch?
- Syntax
- Rewrite sections around "Dynamically Scoped Variables" as a term
- Restrict setting of dynamic variables only inside argument blocks

## Summary
- Constructions like allocators or loggers are high cost BUT low utility to most developers.
- For some developers, support for these constructions is critical.
- For most cases Dynamic Scoping can reduce the cost of supporting these constructions to zero.
- Most of the utility of Dynamic Scoping can be achieved statically.

```
    val y = 2

    fn bar() {
        # The dynamic attribute declares that a variable is dynamically scoped.
        # Static scoping looks for `x` in the scope that defines `bar` (the parent scope)
        # Dynamic scoping looks for `x` in the scope of the function calling `bar`.
        val x: Int #[dynamic]

        # Prints "x is 1, y is 2"
        stdout.writeLn("x is #{x}, y is #{y}")
    }

    fn foo() {
        val x = 1 #[dynamic]
        bar()
    }

    # This works with static trait polymorphism too
    interface Allocator { ... }
    class Foo impl Allocator { ... }
    class Bar impl Allocator { ... }

    fn useAllocator() {
        val allocator: Allocator #[dynamic]
        # Use allocator ...
    }

    val allocator #[dynamic] = Foo{}
    useAllocator() # Statically instantiated to use Foo

    val allocator #[dynamic] = Bar{}
    useAllocator() # Statically instantiated to use Bar
```

## The Problem
For some applications it can be essential to control in detail how the application performs certain
operations, such as memory allocation, as the generic implementation may be completely unsuited for
the application domain. This may seem to be a niche requirement, for most applications it is simply
not a requirement to have this level of control, however applications can achieve higher performance
by swapping generic implementations for application specific implementations - especially when this
can be done for a subset of an application.

One strategy for offering this control is to declare an object that implements the desired operation
and to pass this object around as a parameter throughout the application. This strategy is effective
as it only requires swapping the object to swap the implementation, but to support this control all
code in the application is required to participate in passing the object around - in particular code
that doesn't depend on this implementation at all. For a given developer this trade-off may be worth
making, but clearly this is not a trade-off we should make for the entire language.

## Dynamic Scoping
Why do we have to design a solution to this problem? The trade-off we would force onto developers is
to choose between leaving performance on the floor or increasing your maintenance burden. This isn't
in line with FANG's design goals of **Simplicity** and **Performance** where possible we should not
require developers to give up the simplicity of their code in order to achieve higher performance.

Fortunately we might be able to solve this problem with Dynamic Scoping. As a recap, we will quickly
cover the differences between static scoping (also called lexical scoping) and dynamic scoping with
the following example example.

```
    # We call this "X1" below
    val x = 1

    fn foo() {
        stdout.writeLn(x)
    }

    fn bar() {
        # We call this "X2" below
        val x = 2
        foo()
    }
```

Under static scoping the `x` in `foo` would be resolved to `X1`. When `foo` is compiled the compiler
searches `foo` for a variable named `x` - but no variable exists with that name, so it searches the
scope in which `foo` is defined and finds `X1`.

Under dynamic scoping the `x` in `foo` would be resolved to `X2`. When `foo` is compiled, similar to
static scoping the compiler searches `foo` for a variable named `x` - and again, no variable exists
with that name. When `foo` is executed it looks at the function that called it, `bar` in this case,
searching the scope of `bar` for an `x` ultimately finding `X2`.

Dynamic scoping acts as though we had passed `x` as a parameter from `bar` into `foo`. The number of
functions between `bar` and `foo` do not matter, dynamic scoping will climb up the stack find `bar`
and ultimately find `x`. Dynamic scoping immediately solves our previous problem. Code can support
swapping implementations without having to explicitly pass around objects around to do it.

Unfortunately, dynamic scoping typically has a runtime cost that is greater than if you were passing
those objects around manually. This is not in line with FANG's design goal of **Zero overhead**.

## "Static" Dynamic Scoping
As usual, our strategy to remove overhead will be to find a way to implement this feature statically
at compile time. Consider the previous example with some slight modifications.
    
```
    val dynamic = Map<Str, Str>{}
    val x = "static"

    fn foo() {
        stdout.writeLn(x)                   # Prints "static"
        stdout.writeLn(dynamic.get("x"))    # Prints "dynamic"
    }

    fn bar() {
        var old = dynamic.get("x")

        dynamic.set("x", "dynamic")
        foo()

        dynamic.set("x", old)
    }
```

We have dynamic scoping using a map. There is still runtime overhead in looking up the keys of the
map. To remove this overhead we collect *all* keys that are used to access the map throughout the
entire program and for each key we create a field in a special structure.

```
    class Dynamic {
        x: Str
    }
    val dynamic = Dynamic{}

    val x = "static"

    fn foo() {
        stdout.writeLn(x)           # Prints "static"
        stdout.writeLn(dynamic.x)   # Prints "dynamic"
    }

    fn bar() {
        var old = dynamic.x

        dynamic.x = "dynamic"
        foo()

        dynamic.x = old
    }
```

## Static Polymorphism
This still leaves us with one last source of overhead. If we want to implement memory allocation and
use dynamic scoping to allow developers to override its implementation, the memory allocator must be
polymorphic. To remove this overhead we can statically instantiate new functions for each concrete
type we want to assign to the dynamically scoped variable. For example.

```
    fn useAllocator() {
        val allocator: Allocator #[dynamic]
        # Use allocator ...
    }

    class Foo impl Allocator { ... }
    class Bar impl Allocator { ... }

    val allocator #[dynamic] = Foo{}
    useAllocator() # We call this "U1" below

    val allocator #[dynamic] = Bar{}
    useAllocator() # We call this "U2" below
```

The usual rules of static trait polymorphism apply here - when `U1` is called we can determine that
the dynamically scoped variable `allocator` has the concrete type `Foo` so we instantiate a copy of
`useAllocator` that expects `allocator` to be a `Foo`. Similarly for `U2` a copy of `useAllocator`
is instantiated that expects `allocator` to be a `Bar`. Here's how it may look after instantiation.

```
    class Dynamic {
        allocator_Foo: Foo
        allocator_Bar: Bar
    }
    val dynamic = Dynamic{}

    fn useAllocator_Foo() {
        # Uses allocator_Foo
    }

    fn useAllocator_Foo() {
        # Uses dynamic.allocator_Foo
    }

    fn useAllocator_Bar() {
        # Uses dynamic.allocator_Bar
    }

    dynamic.allocator_Foo = Foo{}
    useAllocator_Foo()

    dynamic.allocator_Bar = Bar{}
    useAllocator_Bar()
```

## Conclusion
TODO
