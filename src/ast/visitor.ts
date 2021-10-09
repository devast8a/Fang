import { Context, Node, NodeId } from '../nodes';

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
        call.push((context, node, id, state) => {
            return visitors[index](context, node, id, state, controls[index]) as typeof node;
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

export type Visitor<State> = <T extends Node>(context: Context, node: T, id: NodeId, state: State) => T;

export type VisitorFn<State> = (context: Context, node: Node, id: NodeId, state: State, control: VisitorControl<State>) => Node;

export interface VisitorControl<State> {
    readonly next: Visitor<State>
    readonly first: Visitor<State>
}

export namespace visit {
    export function fieldNode<T extends Node, State>(context: Context, node: T, id: NodeId, state: State, control: VisitorControl<State>, field: keyof T) {
        const previous = node[field] as any;
        const updated = control.first(context, previous, id, state);

        if (previous !== updated) {
            node = Node.mutate(node, { [field]: updated } as any);
        }

        return control.next(context, node, id, state);
    }

    export function fieldArray<T extends Node, State>(context: Context, node: T, id: NodeId, state: State, control: VisitorControl<State>, field: keyof T) {
        const previous = node[field] as any;
        const updated = array(context, previous, state, control.first);

        if (previous !== updated) {
            node = Node.mutate(node, { [field]: updated } as any);
        }

        return control.next(context, node, id, state);
    }

    export function array<T extends Node, State>(context: Context, children: readonly T[], state: State, visitor: Visitor<State>): readonly T[] {
        const length = children.length;
        for (let child = 0; child < length; child++) {
            const previous = children[child];
            const updated = visitor(context, previous, child, state);

            // Handle the case where one of the called updated the object
            if (previous !== updated) {
                const copy = children.slice();

                copy[child] = updated;
                child++;

                while (child < length) {
                    copy[child] = visitor(context, children[child], child, state);
                    child++;
                }

                return copy;
            }
        }
        return children;
    }
}