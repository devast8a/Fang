import { RNode } from '../nodes/resolved/RNode';
import { Thing, Tag, TagCount } from './things';

type Constructor<T = any, P = any> = { new(...args: any[]): T, prototype: P };

/*
 * Visitor attempts to ease the implementation of applying functions to nodes across the Abstract Syntax Tree.
 * 
 * Here's a quick example of how you can create your own visitor
 *      // Step 1. Create a class that extends from Visitor
 *      class MyVisitor extends Visitor<State, Result> {
 *          // Step 2. Override the constructor
 *          public constructor(){
 *              // Step 3. Choose a default behavior if you don't specify a visitor for a Thing
 *              //  See: ErrorByDefault and VisitByDefault
 *              super(setup, Visitor.ErrorByDefault());
 *          }
 * 
 *          // Step 4. visit is protected, so you'll want to expose visit as a public API somehow.
 *          //  A reasonable solution is to alias the function with a publicly accessible name.
 *          public doMyVisit = super.visit;
 *      }
 * 
 *      // Step 5. Create a structure to hold your visitor's state
 *      class State {
 *          ...
 *      }
 *
 *      // Step 6. Register handlers
 *      function setup(reg: Register<MyVisitor, State, Result>){
 *          reg(Trait, (input, polymorpher, state) => {
 *              ...
 *          })
 * 
 *          reg(Class, (input, polymorpher, state) => {
 *              ...
 *          })
 * 
 *          ...
 *      }
 */
export class Visitor<
    N extends {tag: number},
    State,
    Result,
> {
    public readonly visitors: readonly Handler<N, this, State, Result>[];

    protected constructor(
        setup: (reg: Register<any, State, Result>) => void,
        visitors: Handler<N, any, State, Result>[]
    ) {
        // Clone the array
        visitors = visitors.slice();

        setup((thing, handler) => {
            visitors[thing.tag] = handler as any;
        });

        this.visitors = visitors;
    }

    protected visit<T extends N>(node: T, state: State): (Result extends InputType ? T : Result) {
        return this.visitors[node.tag](node as N, this, state) as any;
    }

    // Throws an exception if a handler for a Thing does not exist.
    //  Reasonable choice if you want to ensure every Thing has a handler.
    public static ErrorByDefault() {
        function throw_visitor_error(thing: Thing, visitor: Visitor<any, any, any>, state: any) {
            throw new Error(`${visitor.constructor.name} does not specify a visitor for ${Tag[thing.tag]}`);
        }

        return new Array(TagCount).fill(throw_visitor_error);
    }

    // Apply the visit function to every child of a Thing if a handler does not exist
    //  Reasonable choice if you only want to apply a function to a handful of Things
    public static VisitByDefault() {
        // TODO: Change how the AST's visit functions work to avoid waste
        function visit_children(thing: Thing, visitor: Visitor<any, any, any>, state: any) {
            const children = new Array<Thing>();
            thing.visit(children);

            for (const child of children) {
                visitor.visit(child, state);
            }
        }

        return new Array(TagCount).fill(visit_children);
    }
}

export type Handler<Thing, Visitor, State, Result> =
    (node: Thing, visitor: Visitor, state: State) => (Result extends InputType ? Thing : Result);

/*
 * When InputType is used as the Result, the return type of a visit must be the same as its input.
 *
 *      function setup(reg: Register<MyVisitor, State, InputType>){
 *          setup(CallStatic, foo); // 'foo' must return a CallStatic
 *          setup(CallField, bar);  // 'bar' must return a CallField
 *      }
 *  
 *      const first: GetVariable = ...
 *      const second = MyVisitor.visit(variable, ...); // second is of type GetVariable
 */
export type InputType = typeof InputType;
const InputType: unique symbol = Symbol();

// See Visitor's example on how to use this
export type Register<Visitor, State, Result> = <Thing>(
    thing: Constructor<Thing> & {tag: Tag},
    handler: Handler<Thing, Visitor, State, Result>
) => void;