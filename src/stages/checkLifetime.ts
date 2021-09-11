import { Flags } from '../common/flags';
import { VariableFlags, Function, Node, Tag, Expr } from '../nodes';

export enum Status {
    Dead,               /// The variable definitely has NO value at a given point
    Alive,              /// The variable definitely has SOME value at a given point
    Dynamic,            /// The variable may or may not have some value at a given point. (It depends on runtime information)
    DynamicReference,   /// TODO: Remove
}

export class VariableState {
    public constructor(
        public status: Status,
        public referTo = new Set<Path>(),
        public referBy = new Set<Path>(),
    ) {}
}

type Path = number | string;

export class GroupedAccess {
    public reads  = new Set<Path>();
    public writes = new Set<Path>();
}

// TODO: Support references
export class State {
    public constructor(
        public parent: State | null,
        public variables: Map<Path, VariableState>,
    ) {}

    /// Copy this state
    public copyState() {
        return new State(this, new Map());
    }

    /// Merge `other` into this state.
    public mergeState(other: State) {
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

    /// Create a reference between a source variable and a destination variable.
    public ref(src: Path, dst: Path) {
        const srcState = this.lookupOrCreate(src);
        const dstState = this.lookupOrCreate(dst);

        srcState.referTo.add(dst);
        dstState.referBy.add(src);
    }

    /// Read a variable. Variable must be alive. No invalidation.
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

    /// Used for non-assignment mutation. Variable must be alive.
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

    /// Used for assignment. Variable must be alive or dead. Destroys existing values.
    public assign(path: Path) {
        // TODO: Check if a deletion needs to happen
        const state = this.lookupOrCreate(path);

        this.killRefBy(path, state);

        state.status = Status.Alive;
        this.variables.set(path, state);
    }

    /// Destroy a value in a variable. Variable must be alive.
    public delete(path: Path) {
        const state = this.lookup(path);

        if (state === null || state.status !== Status.Alive) {
            throw new Error(`Lifetime error`);
        } else {
            this.killRefBy(path, state);
            state.status = Status.Dead;
        }
    }

    /// Move a value from a variable. Variable must be alive.
    public move(path: Path) {
        const state = this.lookup(path);

        if (state === null || state.status !== Status.Alive) {
            throw new Error(`Lifetime error`);
        } else {
            this.killRefBy(path, state);
            state.status = Status.Dead;
        }
    }

    private killRefBy(path: Path, state: VariableState) {
        for (const ref of state.referBy) {
            const refState = this.lookup(ref);

            if (refState === null) throw new Error(`Internal Error: Reference state should exist, but doesn't`);

            refState.referTo.delete(path);

            if (refState.referTo.size === 0) {
                refState.status = Status.Dead;
            } else {
                refState.status = Status.DynamicReference;
            }
        }
    }

    /// Return the state linked with a variable. Returns null if no state has been linked.
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

    /// Return the state linked to a variable. If no state has been linked, create new state and linked it.
    private lookupOrCreate(path: Path): VariableState {
        let state = this.lookup(path);

        if (state === null) {
            state = new VariableState(Status.Dead);
            this.variables.set(path, state);
        }

        return state;
    }
}

export function checkLifetimeNodes(nodes: Node[]) {
    const state = new State(null, new Map());

    for (const node of nodes) {
        analyzeNode(node, state);
    }
}

function exprToPath(expr: Expr): Path {
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

function format(state: State, fn: Function) {
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

const warned = new Set();
export function analyzeNode(node: Node, state: State) {
    switch (node.tag) {
        case Tag.Class:
        case Tag.Trait:
        case Tag.ExprConstruct:
        {
            // TODO[devast8a]: Implement lifetime analysis for these tags
            const warning = `checkLifetime>analyzeNode>${Tag[node.tag]}: Not implemented yet`;
            if (warned.has(warning)) return;
            warned.add(warning);
            console.warn(warning);
            return;
        }

        case Tag.Function: {
            const fstate = state.copyState();
            analyzeNodes(node.body, fstate);
            console.log(node.name + ": " + format(fstate, node));
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
                console.warn(`Skipped ${node.target.name}`)
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
            //  We currently opt not to do this, so that problems will occur in program order
            const final = state.copyState();

            // First branch
            analyzeNode(node.branches[0].condition, final)
            analyzeNodes(node.branches[0].body, final);

            // Remaining branches
            for (let i = 1; i < node.branches.length; i++) {
                const branch = node.branches[i];
                const branchState = state.copyState();

                analyzeNode(branch.condition, branchState);
                analyzeNodes(branch.body, branchState);
                final.mergeState(branchState);
            }

            // Else branch
            analyzeNodes(node.elseBranch, state);
            state.mergeState(final);
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

function analyzeNodes(nodes: Node[], state: State) {
    for (const node of nodes) {
        analyzeNode(node, state);
    }
}