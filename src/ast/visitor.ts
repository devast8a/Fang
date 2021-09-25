import { Context, Node } from '../nodes';

/**
 * Creates a "Chain of Responsibility", a list of functions where each function can perform a computation on a node
 *  and/or pass the node to the some other function in the list.
 * 
 * Each function supplied to createVisitor receives a VisitorControl structure that contains the following functions.
 *  - next, calls the next function in the list
 *  - first, calls the first function in the list
 * 
 * There are several visitor functions (eg. VisitChildren) that can be used to quickly construct a typical AST visit
 *  pass. These visitor functions have the same general structure: switch on the type of node, call `first` to recurse
 *  into any children nodes, and call `next` to pass the node to the next visitor function.
 * 
 * A quick example:
 * ```
 * createVisitor(VisitChildren, (node) => {
 *   if (node.tag === Tag.DeclFunction) {
 *     console.log(`It's a function named ${node.name}`)
 *   }
 *   return node;
 * })
 * ```
 */
export function createVisitor<State = null>(...visitors: VisitorFn<State>[]): Visitor<State> {
    const controls = new Array<VisitorControl<State>>();
    const call = new Array<Visitor<State>>();

    for (let index = 0; index < visitors.length; index++) {
        call.push((node, context, state) => {
            return visitors[index](node, context, state, controls[index]) as typeof node;
        });
    }

    // In case the last function in the chain calls next, we want to throw a more meaningful error rather than
    //  throw a null reference exception.
    call.push(() => {
        throw new Error('Called Control.next, but there is no next visitor');
    });

    for (let index = 0; index < visitors.length; index++) {
        controls.push({
            first:   call[0],
            next:    call[index + 1],
        });
    }

    return call[0];
}

export type Visitor<State> = <T extends Node>(node: T, context: Context, state: State) => T;

export type VisitorFn<State> = (node: Node, context: Context, state: State, control: VisitorControl<State>) => Node;

export interface VisitorControl<State> {
    readonly next: Visitor<State>
    readonly first: Visitor<State>
}

export namespace visit {
    /**
     * Visits an array of nodes. Similar to Array.map although it does not produce a copy of the array -unless- an
     *  the function returns a different object.
     * 
     * TODO: This will likely become obsolete when expression flattening is introduced.
     */
    export function array<T extends Node, State>(nodes: T[], context: Context, state: State, visitor: Visitor<State>): T[] {
        const length = nodes.length;
        for (let index = 0; index < length; index++) {
            const input  = nodes[index];
            const output = visitor(input, context, state);

            // Handle the case where one of the functions returned a new object.
            if (input !== output) {
                const copy = nodes.slice();

                copy[index] = output;
                index++;

                while (index < length) {
                    copy[index] = visitor(nodes[index], context, state);
                    index++;
                }

                return copy;
            }
        }
        return nodes;
    }
}