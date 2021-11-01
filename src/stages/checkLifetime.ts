import { Flags } from '../common/flags';
import { Lifetime } from '../errors';
import { Tag, Context, Ref, Node, DeclVariable, DeclVariableFlags, NodeId, RefAny, ExprCall, ExprGet, unreachable, RootId, Expr, TypeGet } from '../nodes';

/**
 * checkLifetime - Checks that a program conforms to FANG's Lifetime rules.
 * 
 * This is split into three major components.
 * - Language Semantics: `checkLifetime` and friends
 * - Lifetime Implementation: `ProgramState` and friends
 * - Utilities
 * 
 * Language Semantics maps the semantics of the FANG language to
 *  a simpler set of verbs that are defined by 'Lifetime Implementation'.
 * 
 * Language Semantics defines:
 * - when a variable is read, written, assigned, destroyed, or moved.
 * - when a variable references another variable
 * - when control flow splits and merges together again
 * but, doesn't actually define the meaning of any of these verbs.
 * 
 * Lifetime Implementation defines these verbs and ensures that the following
 * rules are followed:
 * - when a variable is read, written, destroyed, or moved - it must be alive.
 * - when a variable is written - any references to it are destroyed
 * - variables may not be simultaneously read and written to through different references
 */

/** Language Semantics *********************************************************/

export function checkLifetime(context: Context) {
    const parent = new ProgramState(null, new Map());

    const nodes = context.module.children.nodes;

    for (let id = 0; id < nodes.length; id++) {
        const node = nodes[id];

        if (node.tag === Tag.DeclFunction) {
            const ctx = context.createChildContext(node.children, id);
            const state = parent.copyState();

            for (let i = 0; i < node.parameters.length; i++) {
                state.assign(context, refToPath(context, node.parameters[i]));
            }

            checkLifetimeNodes(ctx, node.children.body, state);
        }
    }

    return context.module;
}

function checkLifetimeNode(context: Context, id: NodeId, state: ProgramState) {
    const node = context.get(id);

    switch (node.tag) {
        case Tag.DeclVariable: {
            if (node.value !== null) {
                checkLifetimeNode(context, node.value, state);
                state.assign(context, refToPath(context, id));
            }
            return;
        }

        case Tag.ExprCall: {
            const fn = context.get(node.target);

            // Apply constraints to arguments
            const group = new GroupedAccess();
            for (let index = 0; index < node.args.length; index++) {
                const param = Node.as(fn.children.nodes[fn.parameters[index]], DeclVariable);
                const arg = context.get(node.args[index]);

                switch (arg.tag) {
                    case Tag.ExprGet: {
                        const path = refToPath(context, arg.target);

                        if (Flags.has(param.flags, DeclVariableFlags.Mutable)) {
                            state.write(context, path, group);
                        } else {
                            state.read(context, path, group);
                        }
                        break;
                    }
                        
                    // TODO: Support nested calls and nested create
                    case Tag.ExprCreate:
                    case Tag.ExprCall:
                        break;
                        
                    case Tag.ExprConstant: {
                        // No analysis required
                        break;
                    }
                        
                    default: {
                        throw new Error(`Unreachable: Unhandled case '${Tag[(arg as any).tag]}'`);
                    }
                }
            }

            // Apply any lifetime constraints from `fn`
            if (fn.attributes.length > 0) {
                //state.ref(
                //    refToPath(context, (context.get(node.args[0]) as ExprGet).target),
                //    refToPath(context, (context.get(node.args[1]) as ExprGet).target),
                //);
            }

            return;
        }
            
        case Tag.ExprCreate: {
            checkLifetimeNodes(context, node.args, state);
            // TODO: Support arguments for ExprCreate
            return;
        }

        case Tag.ExprConstant: {
            // No analysis required
            return;
        }
            
        case Tag.ExprDeclaration: {
            return;
        }
            
        case Tag.ExprDestroy: {
            state.delete(context, refToPath(context, node.target));
            return;
        }

        case Tag.ExprGet: {
            state.read(context, refToPath(context, node.target));
            return;
        }

        case Tag.ExprSet: {
            checkLifetimeNode(context, node.value, state);
            state.assign(context, refToPath(context, node.target));
            return;
        }

        case Tag.ExprReturn: {
            if (node.value !== null) {
                checkLifetimeNode(context, node.value, state);
            }
            return;
        }
    }

    throw new Error(`Unreachable: Unhandled case '${Tag[(node as any).tag]}'`);
}

function checkLifetimeNodes(context: Context, exprs: ReadonlyArray<NodeId>, state: ProgramState) {
    for (const expr of exprs) {
        checkLifetimeNode(context, expr, state);
    }
}

/** Lifetime Implementation ****************************************************/

enum Status {
    Dead,               /** The variable definitely has NO value at a given point (ie. It is not valid to use or reference) */
    Alive,              /** The variable definitely has A value at a given point (ie. It is valid to use and reference) */
    Dynamic,            /** The variable may or may not have some value at a given point (ie. It depends on runtime information) */
}

type Path = number[];
type PathKey = string;

/** Used to track simultaneous access to a group of variables. See: ExprCallStatic as an example. */
class GroupedAccess {
    public reads  = new Map<PathKey, Path>();
    public writes = new Map<PathKey, Path>();
}

/** Tracks the state of one specific variable */
class VariableState {
    public constructor(
        public readonly path: Path,
        public status: Status,
        public readonly referTo = new Set<PathKey>(),
        public readonly referBy = new Set<PathKey>(),
    ) {}
}

class ProgramState {
    public constructor(
        public parent: ProgramState | null,
        public variables: Map<PathKey, VariableState>,
    ) {}

    /** Create a copy of the current state. Do -NOT- modify the original while copy is alive. */
    public copyState() {
        return new ProgramState(this, new Map());
    }

    /** Merge `other` into this the current state. The result is a state that is consistent with both states. */
    public mergeState(other: ProgramState) {
        // TODO: Need to lookup in ancestors
        // TODO: Support references
        //for (const [path, o] of other.variables) {
        //    const t = this.lookup(path);

        //    if (t.status !== o.status) {
        //        t.status = Status.Dynamic
        //    }

        //    // Merge references together
        //    for (const ref of o.referTo) {
        //        if (!t.referTo.has(ref)) {
        //            this.ref(path, ref);
        //        }
        //    }
        //}
    }

    /** Create a reference between a source variable and a destination variable. */
    //public ref(src: Path, dst: Path) {
    //    const srcState = this.lookup(src);
    //    const dstState = this.lookup(dst);

    //    srcState.referTo.add(dst);
    //    dstState.referBy.add(src);
    //}

    /** Read a variable. Variable must be alive. No invalidation. */
    public read(context: Context, path: Path, group?: GroupedAccess) {
        const state = this.lookup(path);

        if (state.status !== Status.Alive) {
            context.error(new Lifetime.NotAliveError());
        }
    }

    /** Used for non-assignment mutation. Variable must be alive. */
    public write(context: Context, path: Path, group?: GroupedAccess) {
        const state = this.lookup(path);

        if (state.status !== Status.Alive) {
            context.error(new Lifetime.NotAliveError());
        }
    }

    /** Used for assignment. Variable must be alive or dead. Destroys existing values. */
    public assign(context: Context, path: Path) {
        // TODO: Check if a deletion needs to happen
        const state = this.lookup(path);

        this.killRefBy(context, path, state);
        state.status = Status.Alive;
    }

    /** Destroy a value in a variable. Variable must be alive. */
    public delete(context: Context, path: Path) {
        const state = this.lookup(path);

        if (state.status !== Status.Alive) {
            context.error(new Lifetime.NotAliveError());
        } else {
            this.killRefBy(context, path, state);
            state.status = Status.Dead;
        }
    }

    /** Move a value from a variable. Variable must be alive. */
    public move(context: Context, path: Path) {
        const state = this.lookup(path);

        if (state.status !== Status.Alive) {
            context.error(new Lifetime.NotAliveError());
        } else {
            this.killRefBy(context, path, state);
            state.status = Status.Dead;
        }
    }

    public toString(context: Context) {
        function pathToName(context: Context, path: Path) {
            const names = [];

            let nodes = context.container.nodes;

            for (let index = 0; index < path.length - 1; index++) {
                const id = path[index];
                const node = nodes[id];
                const name = Node.getName(node) ?? `%${id}`;
                names.push(name);

                const type = Expr.getReturnType(context, node);
                // TODO: Replace manual resolving code
                nodes = Node.getChildren(context.get((type as TypeGet).target))!.nodes;
            }

            const id = path[path.length - 1]
            const node = nodes[id];
            const name = Node.getName(node) ?? `%${id}`;
            names.push(name)

            return names.join('.');
        }

        const variables = Array.from(this.variables.entries());

        return variables.map(([_, state]) => {
            // Path to name
            const name = pathToName(context, state.path);
            const status = Status[state.status];
            const refs = Array.from(state.referTo).map(key =>
                pathToName(context, this.variables.get(key)!.path)
            );

            if (refs.length > 0) {
                return `${name}: ${status} => {${refs.join(", ")}}`
            } else {
                return `${name}: ${status}`
            }
        }).join(', ');
    }

    /** Kill all the variables that reference the current variable */
    private killRefBy(context: Context, path: Path, state: VariableState) {
        //for (const ref of state.referBy) {
        //    const refState = this.lookup(ref);

        //    if (refState === null) throw new Error(`Internal Error: Reference state should exist, but doesn't`);

        //    refState.referTo.delete(path);

        //    if (refState.referTo.size === 0) {
        //        refState.status = Status.Dead;
        //    }
        //}
    }

    /** Return the state linked with a variable. */
    private lookupPathHead(path: Path): VariableState {
        const key = path[0].toString();

        // Lookup in this
        let state = this.variables.get(key);
        if (state !== undefined) {
            return state;
        }

        // Lookup in parent
        let current = this.parent;
        while (current !== null) {
            const state = current.variables.get(key);

            if (state !== undefined) {
                // Copy state from ancestor - since we might modify it
                const copy = new VariableState(
                    state.path,
                    state.status,
                    new Set(state.referTo),
                    new Set(state.referBy),
                );

                this.variables.set(key, copy);
                return copy;
            }

            current = current.parent;
        }

        // Insert new state
        state = new VariableState([path[0]], Status.Dead);
        this.variables.set(key, state);
        return state;
    }

    private lookup(path: Path): VariableState {
        let state = this.lookupPathHead(path);

        for (let index = 1; index < path.length; index++) {
            const id = path.slice(0, index + 1);
            const key = id.join('.');
            let child = this.variables.get(key);

            if (child === undefined) {
                child = new VariableState(id, state.status);
                this.variables.set(key, child);
            }

            state = child;
        }

        return state;
    }
}

/** Utilities ******************************************************************/

function refToPath(context: Context, ref: RefAny): Path {
    if (Ref.isLocal(ref)) {
        return [ref];
    }

    switch (ref.tag) {
        case Tag.RefLocal:        return [ref.id];
        case Tag.RefFieldId: {
            const target = context.get(ref.target);

            switch (target.tag) {
                case Tag.ExprGet:      return refToPath(context, target.target).concat(ref.field);
                case Tag.DeclVariable: return [ref.target, ref.field];
                default:               throw unreachable(target);
            }
        }
    }

    throw unreachable(ref);
}