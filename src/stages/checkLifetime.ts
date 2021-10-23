import { Flags } from '../common/flags';
import { Tag, Context, Ref, Node, DeclVariable, DeclVariableFlags, NodeId, RefAny } from '../nodes';

/**
 * checkLifetime - Checks that a program conforms to FANG's Lifetime rules.
 * 
 * This is split into three major components.
 * - Language Semantics: `checkLifetime` and friends
 * - Lifetime Implementation: `ProgramState` and friends
 * - Utilities
 * 
 * Language Semantics maps the semantics of the FANG language to
 *  a simpler set of verbs that are defined by Lifetime Implementation.
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

            //for (let i = 0; i < node.parameters.length; i++) {
            //    state.assign(i);
            //}

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
                state.assign(refToPath(id));
            }
            return;
        }

        case Tag.ExprCall: {
            checkLifetimeNodes(context, node.args, state);

            const fn = context.get(node.target);
            const group = new GroupedAccess();

            for (let index = 0; index < node.args.length; index++) {
                const param = Node.as(fn.children.nodes[fn.parameters[index]], DeclVariable);
                const arg = context.get(node.args[index]);

                switch (arg.tag) {
                    case Tag.ExprGet: {
                        const path = refToPath(arg.target);

                        if (Flags.has(param.flags, DeclVariableFlags.Mutable)) {
                            state.write(path, group);
                        } else {
                            state.read(path, group);
                        }
                        return;
                    }
                        
                    case Tag.ExprCall: {
                        // TODO: Pull in lifetime constraints from the nested call
                        return;
                    }
                        
                    default: {
                        throw new Error(`Unreachable: Unhandled case '${Tag[(arg as any).tag]}'`);
                    }
                }
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
            
        case Tag.ExprDestroy: {
            state.delete(refToPath(node.target));
            return;
        }

        case Tag.ExprGet: {
            state.read(refToPath(node.target));
            return;
        }

        case Tag.ExprSet: {
            checkLifetimeNode(context, node.value, state);
            state.assign(refToPath(node.target));
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

type Path = number | string;

/** Used to track simultaneous access to a group of variables. See: ExprCallStatic as an example. */
class GroupedAccess {
    public reads  = new Set<Path>();
    public writes = new Set<Path>();
}

/** Tracks the state of one specific variable */
class VariableState {
    public constructor(
        public status: Status,
        public referTo = new Set<Path>(),
        public referBy = new Set<Path>(),
    ) {}
}

class ProgramState {
    public constructor(
        public parent: ProgramState | null,
        public variables: Map<Path, VariableState>,
    ) {}

    /** Create a copy of the current state. Do -NOT- modify the original while copy is alive. */
    public copyState() {
        return new ProgramState(this, new Map());
    }

    /** Merge `other` into this the current state. The result is a state that is consistent with both states. */
    public mergeState(other: ProgramState) {
        // TODO: Need to lookup in ancestors
        // TODO: Support references
        for (const [path, o] of other.variables) {
            const t = this.lookupOrCreate(path);

            if (t.status !== o.status) {
                t.status = Status.Dynamic
            }

            // Merge references together
            for (const ref of o.referTo) {
                if (!t.referTo.has(ref)) {
                    this.ref(path, ref);
                }
            }
        }
    }

    /** Create a reference between a source variable and a destination variable. */
    public ref(src: Path, dst: Path) {
        const srcState = this.lookupOrCreate(src);
        const dstState = this.lookupOrCreate(dst);

        srcState.referTo.add(dst);
        dstState.referBy.add(src);
    }

    /** Read a variable. Variable must be alive. No invalidation. */
    public read(path: Path, group?: GroupedAccess) {
        if (path === 'FIELD') {
            return;
        }

        const state = this.lookup(path);

        if (state === null || state.status !== Status.Alive) {
            throw new Error(`Lifetime error`);
        }

        // No other access in the group should write to the variable
        if (group !== undefined) {
            if (group.writes.has(path)) {
                throw new Error(`Lifetime error`);
            }

            for (const ref of state.referBy) {
                if (group.writes.has(ref)) {
                    throw new Error(`Lifetime error`);
                }

                group.reads.add(ref);
            }

            group.reads.add(path);
        }
    }

    /** Used for non-assignment mutation. Variable must be alive. */
    public write(path: Path, group?: GroupedAccess) {
        const state = this.lookup(path);

        if (state === null || state.status !== Status.Alive) {
            throw new Error(`Lifetime error`);
        }

        // No other access in the group should read from or write to the variable
        if (group !== undefined) {
            if (group.reads.has(path) || group.writes.has(path)) {
                throw new Error(`Lifetime error`);
            }

            for (const ref of state.referBy) {
                if (group.reads.has(ref) || group.writes.has(ref)) {
                    throw new Error(`Lifetime error`);
                }

                group.writes.add(ref);
            }

            group.writes.add(path);
        }
    }

    /** Used for assignment. Variable must be alive or dead. Destroys existing values. */
    public assign(path: Path) {
        // TODO: Check if a deletion needs to happen
        const state = this.lookupOrCreate(path);

        this.killRefBy(path, state);

        state.status = Status.Alive;
        this.variables.set(path, state);
    }

    /** Destroy a value in a variable. Variable must be alive. */
    public delete(path: Path) {
        const state = this.lookup(path);

        if (state === null || state.status !== Status.Alive) {
            throw new Error(`Lifetime error`);
        } else {
            this.killRefBy(path, state);
            state.status = Status.Dead;
        }
    }

    /** Move a value from a variable. Variable must be alive. */
    public move(path: Path) {
        const state = this.lookup(path);

        if (state === null || state.status !== Status.Alive) {
            throw new Error(`Lifetime error`);
        } else {
            this.killRefBy(path, state);
            state.status = Status.Dead;
        }
    }

    /** Kill all the variables that reference the current variable */
    private killRefBy(path: Path, state: VariableState) {
        for (const ref of state.referBy) {
            const refState = this.lookup(ref);

            if (refState === null) throw new Error(`Internal Error: Reference state should exist, but doesn't`);

            refState.referTo.delete(path);

            if (refState.referTo.size === 0) {
                refState.status = Status.Dead;
            }
        }
    }

    /** Return the state linked with a variable. Returns null if no state has been linked. */
    private lookup(path: Path): VariableState | null {
        // Lookup in this
        const state = this.variables.get(path);
        if (state !== undefined) {
            return state;
        }

        // Lookup in parent
        let current = this.parent;
        while (current !== null) {
            const state = current.variables.get(path);

            if (state !== undefined) {
                // Copy state from ancestor - since we might modify it
                const copy = new VariableState(
                    state.status,
                    new Set(state.referTo),
                    new Set(state.referBy),
                );

                this.variables.set(path, copy);
                return copy;
            }

            current = current.parent;
        }

        // Lookup failed
        return null
    }

    /** Return the state linked to a variable. If no state has been linked, create new state and linked it. */
    private lookupOrCreate(path: Path): VariableState {
        let state = this.lookup(path);

        if (state === null) {
            state = new VariableState(Status.Dead);
            this.variables.set(path, state);
        }

        return state;
    }
}

/** Utilities ******************************************************************/

function refToPath(ref: RefAny): Path {
    if (Ref.isLocal(ref)) {
        return ref.toString();
    }

    switch (ref.tag) {
        case Tag.RefGlobal:       return `global.${ref.id}`;
        case Tag.RefGlobalDecl:   return `global.${ref.id}.${ref.member}`;
        case Tag.RefLocal:        return ref.id;
    }

    throw new Error('Unreachable');
}