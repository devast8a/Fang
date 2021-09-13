import { Flags } from '../common/flags';
import { VariableFlags, Function, Node, Tag } from '../nodes';

/**
 * checkLifetime - Checks that a program conforms to FANG's Lifetime rules.
 * 
 * This is split into three major components.
 * - Language Semantics: `analyzeNode` and friends
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

export function checkLifetime(nodes: Node[]) {
    const state = new ProgramState(null, new Map());

    for (const node of nodes) {
        analyzeNode(node, state);
    }
}

function analyzeNode(node: Node, state: ProgramState) {
    switch (node.tag) {
        case Tag.Class:
        case Tag.Trait:
        case Tag.ExprConstruct:
        {
            console.warn(`checkLifetime>analyzeNode>${Tag[node.tag]}: Not implemented yet`);
            return;
        }

        case Tag.Function: {
            const fnState = state.copyState();

            for (const parameter of node.parameters) {
                fnState.assign(parameter.id);
            }

            analyzeNodes(node.body, fnState);
            console.log(node.name + ": " + format(fnState, node));
            return;
        }

        case Tag.Variable: {
            if (node.value !== null) {
                analyzeNode(node.value, state);
                state.assign(node.id);

                // TODO: Handle references in a better way
                if (
                    node.value.tag === Tag.ExprConstruct &&
                    node.value.target.tag === Tag.Class &&
                    node.value.target.name === "Ref" &&
                    node.value.args[0].tag === Tag.ExprGetLocal
                ) {
                    state.ref(node.id, node.value.args[0].local);
                }
            }

            return;
        }

        case Tag.ExprCallStatic: {
            analyzeNodes(node.args, state);

            // TODO: Properly resolve function calling
            if (node.target.tag === Tag.Function) {
                const group  = new GroupedAccess();
                const args   = node.args;
                const params = node.target.parameters;

                for (let i = 0; i < params.length; i++) {
                    const arg   = args[i];
                    const param = params[i];

                    // TODO: Handle nested calls properly
                    // For now assume it's a move
                    if (arg.tag === Tag.ExprCallStatic) {
                        const path = exprToPath(arg.args[0]);
                        state.move(path);
                        continue;
                    }

                    const path = exprToPath(arg);
                    if (Flags.has(param.flags, VariableFlags.Mutates)) {
                        state.write(path, group);
                    } else {
                        state.read(path, group);
                    }
                }
            } else {
                console.warn(`Skipped ${node.target}`)
            }

            return;
        }

        case Tag.ExprConstant: {
            // No analysis required
            return;
        }

        case Tag.ExprGetLocal: {
            state.read(node.local);
            return;
        }

        case Tag.ExprSetField: {
            analyzeNode(node.value, state);
            analyzeNode(node.object, state);
            state.assign(exprToPath(node));
            return;
        }

        case Tag.ExprSetLocal: {
            analyzeNode(node.value, state);

            state.assign(node.local);

            // TODO: Handle references in a better way
            if (
                node.value.tag === Tag.ExprConstruct &&
                node.value.target.tag === Tag.Class &&
                node.value.target.name === "Ref" &&
                node.value.args[0].tag === Tag.ExprGetLocal
            ) {
                state.ref(node.local, node.value.args[0].local);
            }

            return;
        }

        case Tag.StmtDelete: {
            state.delete(node.variable);
            return;
        }

        case Tag.StmtIf: {
            // NOTE: We could optimize away a merge by computing the else branch first and replacing final with state
            //  We currently opt not to do this, so that problems will be reported in program order
            const branches = state.copyState();

            // First branch
            analyzeNode(node.branches[0].condition, branches)
            analyzeNodes(node.branches[0].body, branches);

            // Remaining branches
            for (let i = 1; i < node.branches.length; i++) {
                const branch = node.branches[i];
                const branchState = state.copyState();

                analyzeNode(branch.condition, branchState);
                analyzeNodes(branch.body, branchState);
                branches.mergeState(branchState);
            }

            // Else branch
            analyzeNodes(node.elseBranch, state);
            state.mergeState(branches);
            return;
        }

        case Tag.StmtWhile: {
            // Loop taken one time
            const takenOnce = state.copyState();
            analyzeNode(node.condition, takenOnce);
            analyzeNodes(node.body, takenOnce);

            // Loop taken multiple times
            const takenMultiple = takenOnce.copyState();
            analyzeNode(node.condition, takenMultiple);
            analyzeNodes(node.body, takenMultiple);

            // Loop not taken
            state.mergeState(takenOnce);
            state.mergeState(takenMultiple);
            return;
        }
    }

    throw new Error(`lifetimeCheck: No case for node '${Tag[node.tag]}'`);
}

function analyzeNodes(nodes: Node[], state: ProgramState) {
    for (const node of nodes) {
        analyzeNode(node, state);
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

function exprToPath(expr: Node): Path {
    switch (expr.tag) {
        case Tag.ExprGetLocal: return expr.local;
        case Tag.ExprSetLocal: return expr.local;
        case Tag.ExprGetField: return `${exprToPath(expr.object)}.${expr.field}`;
        default: throw new Error(`exprToPath > ${Tag[expr.tag]} not expected`);
    }
}

function pathToName(path: Path, fn: Function) {
    if (typeof(path) === 'number') {
        return fn.variables[path].name;
    }

    return path;
}

function format(state: ProgramState, fn: Function) {
    const output = [];
    const variables = state.variables;

    for (const [path, variable] of variables) {
        const name   = pathToName(path, fn);
        const status = Status[variable.status];
        const refs   = Array.from(variable.referTo.values()).map((path) => pathToName(path, fn)).join(", ");

        if (refs.length > 0) {
            output.push(`${name}: ${status} => {${refs}}`);
        } else {
            output.push(`${name}: ${status}`);
        }
    }

    return output.join(', ');
}