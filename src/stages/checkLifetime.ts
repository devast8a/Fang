import { Flags } from '../common/flags';
import * as Errors from '../errors';
import { Tag, Context, Ref, Node, DeclVariable, DeclVariableFlags, NodeId, RefAny, unreachable, Expr, TypeGet, RefLocalId, MutContext, ExprBody, ExprDestroy, RefLocal, unimplemented, ExprIfCase } from '../nodes';

/**
 * checkLifetime - Checks that a program conforms to FANG's Lifetime rules.
 * 
 * This is split into three major components.
 * 
 * `checkLifetime` which maps the semantics of the FANG language to a simple set
 * of verbs that are defined by `Lifetime` and `Usage`. It defines the following
 *   - when a variable is read, written, assigned, destroyed, or moved.
 *   - when a variable references another variable
 *   - when control flow forks and joins together again
 *   but, does not define the meaning of any of these verbs.
 * 
 * `Lifetime` defines these verbs and ensures these rules are followed:
 *   - when a variable is read, written, destroyed, or moved - it must be alive.
 *   - when a variable is written - any references to it are destroyed
 *   - variables may not be simultaneously read and written through references
 * 
 * `Usage` tracks which variables are defined and used by the code.
 *   - It tracks which variables need to be destroyed
 *   - It tracks usage information for fast loop analysis
 * 
 * This is the first version of a fast loop analyzer. There are probably some
 *  poor design decisions that need to be revised in a future version.
 * - `Lifetime` is expensive to fork, and we do that a lot.
 * - Two classes `Lifetime` and `Usage` rather than a unified Lifetime class.
 * - Deletion duties are handled partly by `Lifetime` and partly by `Usage`
 * - There is a lot of duplicated work to store Refs in maps
 * - The semantics of 'fork' and 'join' are very subtle and hard to get right.
 */

/** Language Semantics *********************************************************/

export function checkLifetime(context: Context) {
    const parent = new Lifetime(new Map());
    const usage = Usage.create();

    const nodes = context.module.children.nodes;

    for (let id = 0; id < nodes.length; id++) {
        const node = nodes[id];

        if (node.tag === Tag.DeclFunction) {
            const ctx = context.createChildContext(node.children, id);
            const lifetime = parent.fork();

            for (let i = 0; i < node.parameters.length; i++) {
                const id = node.parameters[i];
                const parameter = Node.as(ctx.get(id), DeclVariable);

                if (Flags.has(parameter.flags, DeclVariableFlags.Owns)) {
                    usage.create(context, id);
                }

                lifetime.assign(ctx, id, id);
            }

            checkLifetimeNodes(ctx, node.children.body, lifetime, usage);
        }
    }

    return context.module;
}

function checkLifetimeNode(context: Context, id: NodeId, lifetime: Lifetime, usage: Usage) {
    const node = context.get(id);

    switch (node.tag) {
        case Tag.DeclVariable: {
            if (node.value !== null) {
                checkLifetimeNode(context, node.value, lifetime, usage);
                usage.create(context, id);
                lifetime.assign(context, id, id);
            }
            return;
        }

        case Tag.ExprCall: {
            checkLifetimeNodes(context, node.args, lifetime, usage);

            const fn = context.get(node.target);

            // Apply constraints to arguments
            const group = new GroupedAccess();
            for (let index = 0; index < node.args.length; index++) {
                const param = Node.as(fn.children.nodes[fn.parameters[index]], DeclVariable);
                const arg = context.get(node.args[index]);

                switch (arg.tag) {
                    case Tag.ExprGet: {
                        if (Flags.has(param.flags, DeclVariableFlags.Mutable)) {
                            lifetime.write(context, id, arg.target, group);
                        } else {
                            lifetime.read(context, id, arg.target, group);
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
                        
                    case Tag.ExprMove: {
                        break;
                    }
                        
                    default: {
                        throw unreachable(arg);
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
            checkLifetimeNodes(context, node.args, lifetime, usage);
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
            usage.delete(context, node.target);
            lifetime.delete(context, id, node.target);
            return;
        }

        case Tag.ExprGet: {
            usage.use(context, node.target);
            lifetime.read(context, id, node.target);
            return;
        }

        case Tag.ExprIf: {
            // NOTE[dev]: node.cases are always ExprIfCase, but RefLocalId<T> doesn't pick this up
            const cases = node.cases as any[] as Ref<ExprIfCase>[];

            // First branch
            const first = context.get(cases[0]);
            checkLifetimeNode(context, first.condition!, lifetime, usage);
            const taken = lifetime.fork();
            checkLifetimeNodes(context, first.body, taken, usage);

            // Remaining branches
            for (let index = 1; index < node.cases.length; index++) {
                const node = context.get(cases[0]) as ExprIfCase;

                if (node.condition === null) {
                    // Else branch
                    checkLifetimeNodes(context, node.body, lifetime, usage);
                } else {
                    // Elif branch
                    checkLifetimeNode(context, node.condition, lifetime, usage)
                    const branch = lifetime.fork();
                    checkLifetimeNodes(context, node.body, branch, usage);
                    taken.join(branch);
                }
            }
            
            return;
        }
            
        case Tag.ExprMove: {
            // TODO: Implement
            //checkLifetimeNode(context, node.target, state);
            usage.delete(context, node.target);
            lifetime.move(context, id, node.target);
            return;
        }

        case Tag.ExprSet: {
            checkLifetimeNode(context, node.value, lifetime, usage);
            usage.create(context, node.target);
            lifetime.assign(context, id, node.target);
            return;
        }

        case Tag.ExprReturn: {
            if (node.value !== null) {
                checkLifetimeNode(context, node.value, lifetime, usage);
                
                const value = context.get(node.value);
                if (value.tag === Tag.ExprGet) {
                    // lifetime.declared.delete((value.target as RefLocal).id.toString());
                }
            }

            // lifetime.end(context, id);
            return;
        }
            
        case Tag.ExprWhile: {
            // Collect variable usage throughout the loop.
            const loop = usage.fork();

            // Condition is always executed at least once.
            checkLifetimeNode(context, node.condition, lifetime, loop);

            // Body may or may not be executed, split control flow.
            const body = lifetime.fork();
            checkLifetimeNodes(context, node.body, body, loop);
            lifetime.join(body);

            // Handle looping case. Check all variable usage within the loop is still valid with the final loop state.
            loop.checkUsage(context, lifetime);

            loop.end(context, id);
            return;
        }
    }

    throw new Error(`Unreachable: Unhandled case '${Tag[(node as any).tag]}'`);
}

function checkLifetimeNodes(context: Context, exprs: ReadonlyArray<NodeId>, lifetime: Lifetime, usage: Usage) {
    for (const expr of exprs) {
        checkLifetimeNode(context, expr, lifetime, usage);
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
    public readonly reads  = new Map<PathKey, Path>();
    public readonly writes = new Map<PathKey, Path>();
}

/** Tracks the state of one specific variable */
class VariableState {
    public constructor(
        public readonly path: Path,
        public status: Status,
        public readonly referTo = new Set<PathKey>(),
        public readonly referBy = new Set<PathKey>(),
    ) { }
    
    public copy() {
        return new VariableState(this.path, this.status, new Set(this.referTo), new Set(this.referBy));
    }
}

class Usage {
    private constructor(
        private parent: Usage | null,
        private defined: Map<PathKey, RefAny>,
        private used: Map<PathKey, Path>,
    ) { }

    public static create() {
        return new Usage(null, new Map(), new Map());
    }

    public fork(): Usage {
        return new Usage(this, new Map(), new Map());
    }

    public create(context: Context, ref: RefAny) {
        const key = refToPath(context, ref).join('.');
        this.defined.set(key, ref);
    }

    public delete(context: Context, ref: RefAny) {
        const key = refToPath(context, ref).join('.');
        this.defined.delete(key);
    }

    public use(context: Context, ref: RefAny) {
        const path = refToPath(context, ref);
        const key = path.join('.');

        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let current: Usage | null = this;
        while (current !== null) {
            if (current.defined.has(key)) {
                break;
            }
            current.used.set(key, path);
            current = current.parent;
        }
    }

    public checkUsage(context: Context, lifetime: Lifetime) {
        for (const entry of this.used) {
            const path = entry[1];

            const state = lifetime.lookup(path);
            if (state.status !== Status.Alive) {
                context.error(new Errors.Lifetime.NotAliveError());
            }
        }
    }
    
    public end(context: Context, ref: RefLocalId) {
        // Emit destroy
    }
}

class Lifetime {
    public constructor(
        public readonly variables: Map<PathKey, VariableState>,
    ) { }

    /** Create a copy of the current state. */
    public fork() {
        const variables = new Map(Array.from(this.variables).map(([key, value]) => [key, value.copy()]))
        return new Lifetime(variables);
    }

    /** Merge `other` into this the current state. The result is a state that is consistent with both states. */
    public join(other: Lifetime) {
        for (const [key, otherVariable] of other.variables) {
            const thisVariable = this.variables.get(key);

            if (thisVariable === undefined) {
                console.error("Lifetime > Unhandled variable merge");
                continue;
            }

            if (thisVariable.status !== otherVariable.status) {
                thisVariable.status = Status.Dynamic;
            }
        }
    }

    /** Read a variable. Variable must be alive. No invalidation. */
    public read(context: Context, id: RefLocalId, ref: RefAny, group?: GroupedAccess) {
        const path = refToPath(context, ref);
        const state = this.lookup(path);

        if (state.status !== Status.Alive) {
            context.error(new Errors.Lifetime.NotAliveError());
            return;
        }
    }

    /** Used for non-assignment mutation. Variable must be alive. */
    public write(context: Context, id: RefLocalId, ref: RefAny, group?: GroupedAccess) {
        const path = refToPath(context, ref);
        const state = this.lookup(path);

        if (state.status !== Status.Alive) {
            context.error(new Errors.Lifetime.NotAliveError());
            return;
        }
    }

    /** Used for assignment. Variable must be alive or dead. Destroys existing values. */
    public assign(context: Context, id: RefLocalId, ref: RefAny) {
        const path = refToPath(context, ref);
        const state = this.lookup(path);

        this.killRefBy(context, path, state);
        state.status = Status.Alive;
    }

    /** Destroy a value in a variable. Variable must be alive. */
    public delete(context: Context, id: RefLocalId, ref: RefAny) {
        const path = refToPath(context, ref);
        const state = this.lookup(path);

        if (state.status !== Status.Alive) {
            context.error(new Errors.Lifetime.NotAliveError());
            return;
        }

        this.killRefBy(context, path, state);
        state.status = Status.Dead;
    }

    /** Move a value from a variable. Variable must be alive. */
    public move(context: Context, id: RefLocalId, ref: RefAny) {
        const path = refToPath(context, ref);
        const state = this.lookup(path);

        if (state.status !== Status.Alive) {
            context.error(new Errors.Lifetime.NotAliveError());
            return;
        }

        this.killRefBy(context, path, state);
        state.status = Status.Dead;
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
    }

    /** Return the state linked with a variable. */
    private lookupPathHead(path: Path): VariableState {
        const key = path[0].toString();

        let state = this.variables.get(key);
        if (state !== undefined) {
            return state;
        }

        state = new VariableState([path[0]], Status.Dead);
        this.variables.set(key, state);
        return state;
    }

    public lookup(path: Path): VariableState {
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