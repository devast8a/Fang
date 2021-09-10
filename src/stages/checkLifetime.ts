import { Flags } from '../common/flags';
import { Class, ExprGetLocal, VariableFlags, Function, Node, Tag, RefVar, Expr } from '../nodes';

export enum Status {
    Dead,
    Alive,
    Dynamic,
    DynamicReference,
}

export class VariableState {
    public constructor(
        public status: Status,
        public referTo = new Set<Path>(),
        public referBy = new Set<Path>(),
    ) {}
}

type Path = number | string;
export class State {
    public constructor(
        public parent: State | null,
        public variables: Map<Path, VariableState>,
    ) {}

    public copyState() {
        return new State(this, new Map());
    }

    public mergeState(other: State) {
        // TODO: Need to lookup in ancestors
        // TODO: Support references
        for (const [path, o] of other.variables) {
            const t = this.lookup(path);

            const ts = t !== null ? t.status : Status.Dead;
            const os = o.status;

            if (ts !== os) {
                this.variables.set(path, new VariableState(Status.Dynamic));
            }
        }
    }

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

    public set(path: Path) {
        // TODO: Check if a deletion needs to happen
        const state = new VariableState(Status.Alive);
        this.variables.set(path, state);
    }

    public read(path: Path) {
        const state = this.lookup(path);

        if (state === null || state.status !== Status.Alive) {
            // TODO: Handle more appropriately
            throw new Error(`Lifetime error`);
        }
    }

    public write(path: Path) {
        throw new Error('Method not implemented.');
    }

    public delete(path: Path) {
        const state = this.lookup(path);

        if (state === null) {
            throw new Error(`Lifetime error`);
        }
            
        if (state.status !== Status.Alive) {
            throw new Error(`Lifetime error`);
        }

        state.status = Status.Dead;
    }

    public move(path: Path) {
        const state = this.lookup(path);

        if (state === null) {
            throw new Error(`Lifetime error`);
        }
            
        if (state.status !== Status.Alive) {
            throw new Error(`Lifetime error`);
        }

        state.status = Status.Dead;
    }
}

export class SimultaneousAccess {
    private reads  = new Set<Path>();
    private writes = new Set<Path>();
    
    public read(path: Path) {
        if (this.writes.has(path)) {
            throw new Error(`Lifetime rejection`);
        }

        this.reads.add(path);
    }

    public write(path: Path) {
        if (this.reads.has(path) || this.writes.has(path)) {
            throw new Error(`Lifetime rejection`);
        }

        // TODO: Support references

        this.writes.add(path);
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

function format(state: State, fn: Function) {
    const output = [];
    const variables = state.variables;

    for (const [path, s] of variables) {
        const status = Status[s.status];

        let name = path;

        if (typeof(path) === 'number') {
            name = fn.variables[path].name;
        }

        output.push(`${name}: ${status}`);
    }

    return output.join(', ');
}

const warned = new Set();
let currentFn: Function = {} as any;
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
            currentFn = node;
            analyzeNodes(node.body, fstate);
            console.log(node.name + ": " + format(fstate, node));
            return;
        }

        case Tag.Variable: {
            if (node.value !== null) {
                analyzeNode(node.value, state);
                state.set(node.id);
            }

            return;
        }

        case Tag.ExprCallStatic: {
            analyzeNodes(node.args, state);

            // TODO: Properly resolve function calling
            if (node.target.tag === Tag.Function) {
                const access = new SimultaneousAccess();
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
                        access.write(path);
                    } else {
                        access.read(path);
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
            state.set(exprToPath(node));
            return;
        }

        case Tag.ExprSetLocal: {
            analyzeNode(node.value, state);
            state.set(node.local);
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