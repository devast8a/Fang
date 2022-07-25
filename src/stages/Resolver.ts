import { Ctx } from '../ast/context';
import { mutate } from '../ast/mutate';
import { Node, Ref, RefId, RefIds, Scope, Tag } from '../ast/nodes';
import { MultiMapUtils, unimplemented } from '../utils';

// export function resolve(ctx: Ctx) {
//     const nodes = ctx.nodes;
// 
//     for (let id = ctx.builtins.count; id < nodes.length; id++) {
//         const node = nodes[id];
// 
//         switch (node.tag) {
//             case Tag.Call: {
//                 switch (node.target.tag) {
//                     case Tag.RefName: nodes[id] = mutate(node, 'target', ref => lookup(node, ref)); break;
//                 }
//                 break;
//             }
// 
//             case Tag.Constant: {
//                 // No resolution needed for constants.
//                 break;
//             }
// 
//             case Tag.Get: {
//                 switch (node.source.tag) {
//                     case Tag.RefName: nodes[id] = mutate(node, 'source', ref => lookup(node, ref)); break;
//                 }
//                 break;
//             }
// 
//             case Tag.Set: {
//                 // This may not be resolvable...
//                 const target = get(ctx, node.target);
// 
//                 if (target.type.tag !== Tag.RefInfer) {
//                     break;
//                 }
// 
//                 nodes[(node.target as RefId).target] = mutate(target, 'type', field => type(ctx, node.source));
//                 break;
//             }
// 
//             case Tag.Variable: {
//                 // No resolution needed for variables.
//                 break;
//             }
//         }
//     }
// 
//     // Lifetime checker!
//     for (let id = ctx.builtins.count; id < nodes.length; id++) {
//         const node = nodes[id];
// 
//         if (node.tag === Tag.Function) {
//             const state = State.create(ctx);
//             for (const n of node.body) {
//                 check(state, n);
//             }
//         }
//     }
// }
// 
// function get<T extends Node>(ctx: Ctx, ref: Ref<T>): T {
//     switch (ref.tag) {
//         case Tag.RefId: return ctx.get(ref);
//         default: throw unimplemented(ref as never);
//     }
// }
// 
// function type<T extends Node>(ctx: Ctx, ref: Ref<T>) {
//     return ref;
// }
// 
// function lookup(node: { parent: Scope }, ref: Ref) {
//     if (ref.tag !== Tag.RefName) {
//         return ref;
//     }
// 
//     let scope = node.parent;
//     let current: Scope | null = scope;
//     const symbol = ref.target;
// 
//     do {
//         const ids = current.symbols.get(symbol);
// 
//         // Symbol does not exist in current scope, look in parent
//         if (ids === undefined) {
//             current = current.parent;
//             continue;
//         }
// 
//         // Resolved the symbol, cache it in the starting scope.
//         while (scope !== current) {
//             MultiMapUtils.pushMulti(scope.symbols, symbol, ids);
// 
//             // We will hit current before we hit null
//             // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
//             scope = scope.parent!;
//         }
// 
//         return ids.length === 1 ? new RefId(ids[0]) : new RefIds(ids);
//     } while (current !== null)
// 
//     // Symbol does not exist at all.
//     return ref;
// }
// 
// function check(state: State, node: Node) {
//     switch (node.tag) {
//         case Tag.Call: {
//             // foo(bar(x, y), qux(x, y))
//             break;
//         }
// 
//         case Tag.Constant: {
//             break;
//         }
// 
//         case Tag.Set: {
//             break;
//         }
//             
//         case Tag.RefId: {
//             check(state, state.ctx.get(node));
//             break;
//         }
// 
//         default: {
//             throw unimplemented(node as never);
//         }
//     }
// }
// 
// enum Status {
//     Dead,    /** The variable definitely has NO value at a given point. */
//     Alive,   /** The variable definitely has SOME value at a given point. */
//     Dynamic, /** The variable may have some value at a given point (ie. It depends on runtime information) */
// }
// 
// type Path = string;
// 
// /** Used to track simultaneous access to a group of variables. See: ExprCallStatic as an example. */
// class Group {
//     public readonly reads  = new Map<Path, Path>();
//     public readonly writes = new Map<Path, Path>();
// }
// 
// class VariableState {
//     public constructor(
//         public status: Status,
//     ) { }
// }
// 
// class State {
//     private constructor(
//         public ctx: Ctx,
//         private parent: State | null,
//         private paths: Map<Path, VariableState>,
//     ) { }
//     
//     public static create(ctx: Ctx) {
//         return new State(ctx, null, new Map());
//     }
// 
//     public read(ref: Ref, group?: Group) {
//         const path = this.lookup(ref);
//         const vs = this.paths.get(path);
// 
//         if (vs === undefined || vs.status !== Status.Alive) {
//             throw new Error(`Expecting ${path} to be alive`);
//         }
//     }
// 
//     public write(ref: Ref, group?: Group) {
//         const path = this.lookup(ref);
//         const vs = this.paths.get(path);
// 
//         if (vs === undefined || vs.status !== Status.Alive) {
//             throw new Error(`Expecting ${path} to be alive`);
//         }
//     }
//     
//     public assign(ref: Ref, group?: Group) {
//         const path = this.lookup(ref);
//         const vs = this.paths.get(path);
// 
//         if (vs === undefined) {
//             this.paths.set(path, new VariableState(Status.Alive));
//         } else {
//             vs.status = Status.Alive;
//         }
//     }
// 
//     private lookup(ref: Ref) {
//         return '';
//     }
// }