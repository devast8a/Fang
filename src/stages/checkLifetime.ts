import { Class, ExprGetLocal, Flags, Function, Node, Tag } from '../nodes';

export enum Status {
    Dead,
    Alive,
    Dynamic,
    DynamicReference,
}

export class State {
    public constructor(
        public variables: Array<Status>,
        public lifetime: Array<Set<number>>,
    ) {}

    public format(fn: Function) {
        const variables = this.variables.
            map((status, id) => `${fn.variables[id].name}: ${Status[status]}`).
            join(", ");

        const lifetime = this.lifetime.
            map((state) => Array.from(state).map(id => fn.variables[id].name).join(", ")).
            map((state, id) => `${fn.variables[id].name}: {${state}}`).
            join(", ");

        return `${fn.name}: ${variables} | ${lifetime}`;
    }

    public copy() {
        return new State(
            this.variables.slice(),
            this.lifetime.map(set => new Set(set)),
        );
    }

    public merge(other: State) {
        for (let i = 0; i < this.variables.length; i++) {
            if (this.variables[i] !== other.variables[i]) {
                this.variables[i] = Status.Dynamic;
            }

            for (const ref of other.lifetime[i]) {
                this.lifetime[i].add(ref);
            }
        }
    }

    public static fromFunction(fn: Function) {
        const len = fn.variables.length;

        return new State(
            new Array(len).fill(Status.Dead),
            new Array(len).fill(0).map(() => new Set()),
        );
    }
}

export function checkLifetimeNodes(nodes: Node[]) {
    for (const node of nodes) {
        analyzeNode(node, new State([], []));
    }
}

export function analyzeNode(node: Node, state: State) {
    switch (node.tag) {
        case Tag.Class: {
            // TODO[devast8a]: Implement lifetime analysis for class
            return;
        }

        case Tag.Function: {
            const fnState = State.fromFunction(node);
            analyzeNodes(node.body, fnState);
            return;
        }

        case Tag.Trait: {
            // TODO[devast8a]: Implement lifetime analysis for trait
            return;
        }

        case Tag.Variable: {
            if (node.value !== null) {
                analyzeNode(node.value, state);
                state.variables[node.id] = Status.Alive;

                // TODO[devast8a]: Check variable type instead of checking node type dynamically
                if (node.value.tag === Tag.ExprConstruct && (node.value.target as Class).name === "Ref") {
                    state.lifetime[node.id].add((node.value.args[0] as ExprGetLocal).local as number);
                }
            }

            return;
        }

        case Tag.ExprCallStatic: {
            // TODO[devast8a]: Implement analysis for calling
            // Assume for now that functions are at most one method call deep (except for move/copy)
            analyzeNodes(node.args, state);

            if (node.target.tag === Tag.Function) {
                const writes = new Set<number>();
                const reads  = new Set<number>();

                for (let i = 0; i < node.target.parameters.length; i++) {
                    const parameter = node.target.parameters[i];
                    const argument  = node.args[i];

                    if (argument.tag === Tag.ExprGetLocal) {
                        // TODO: Support nested function calls
                        const local = argument.local as number;

                        if ((parameter.flags & Flags.Mutates) > 0) {
                            // Mutates
                            if (reads.has(local) || writes.has(local)) {
                                throw new Error('Lifetime rejection');
                            }

                            // References
                            for (const other of state.lifetime[local]) {
                                if (reads.has(other) || writes.has(other)) {
                                    throw new Error('Lifetime rejection');
                                }

                                writes.add(other);
                            }

                            writes.add(local);
                        } else {
                            // Loans
                            if (writes.has(local)) {
                                throw new Error('Lifetime rejection');
                            }

                            // References
                            for (const other of state.lifetime[local]) {
                                if (writes.has(other)) {
                                    throw new Error('Lifetime rejection');
                                }

                                reads.add(other);
                            }

                            reads.add(local);
                        }
                    }
                }
            }

            if (node.target.tag === Tag.ExprRefName && node.target.name === "move") {
                const local = (node.args[0] as ExprGetLocal).local as number;

                state.variables[local] = Status.Dead;
                state.lifetime[local].clear();
                
                // Kill any references
                for (let ref = 0; ref < state.lifetime.length; ref++) {
                    if (state.lifetime[ref].has(local)) {
                        if (state.lifetime[ref].size === 1) {
                            // The reference can only refers to this value
                            // Kill the reference too
                            state.lifetime[ref].delete(local);
                            state.variables[ref] = Status.Dead;
                        } else {
                            // The reference may refer to this value
                            state.lifetime[ref].delete(local);
                            state.variables[ref] = Status.DynamicReference;
                        }
                    }
                }
            }
            return;
        }

        case Tag.ExprConstant: {
            // No analysis required
            return;
        }

        case Tag.ExprConstruct: {
            // TODO[devast8a]: Implement analysis for construction
            return;
        }

        case Tag.ExprGetLocal: {
            if (state.variables[node.local as number] !== Status.Alive) {
                throw new Error("Rejected by lifetime checker");
            }
            return;
        }

        case Tag.ExprSetLocal: {
            analyzeNode(node.value, state);

            const id = node.local as number;

            switch (state.variables[id]) {
                case Status.Alive: console.log("KILL EXISTING"); break;
                case Status.Dynamic: console.log("MAY KILL EXISTING"); break;
                case Status.Dead: break;
            }

            state.variables[id] = Status.Alive;

            // If the variable is a reference, we will keep track of the variable it references
            // TODO[devast8a]: Check variable type instead of checking node type dynamically
            if (node.value.tag === Tag.ExprConstruct && (node.value.target as Class).name === "Ref") {
                state.lifetime[id].add((node.value.args[0] as ExprGetLocal).local as number);
            }

            return;
        }

        case Tag.StmtIf: {
            // NOTE: We could optimize away a merge by computing the else branch first and replacing final with state
            //  We currently opt not to do this, so that problems will occur in program order
            const final = state.copy();

            // First branch
            analyzeNode(node.branches[0].condition, final)
            analyzeNodes(node.branches[0].body, final);

            // Remaining branches
            for (let i = 1; i < node.branches.length; i++) {
                const branch = node.branches[i];
                const branchState = state.copy();

                analyzeNode(branch.condition, branchState);
                analyzeNodes(branch.body, branchState);
                final.merge(branchState);
            }

            // Else branch
            analyzeNodes(node.elseBranch, state);
            state.merge(final);
            return;
        }

        case Tag.StmtWhile: {
            // Loop taken one time
            const takenOnce = state.copy();
            analyzeNode(node.condition, takenOnce);
            analyzeNodes(node.body, takenOnce);

            // Loop taken multiple times
            const takenMultiple = takenOnce.copy();
            analyzeNode(node.condition, takenMultiple);
            analyzeNodes(node.body, takenMultiple);

            // Loop not taken
            state.merge(takenOnce);
            state.merge(takenMultiple);
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