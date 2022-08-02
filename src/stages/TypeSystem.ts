import { Ctx } from '../ast/context';
// import { Formatter } from '../ast/formatter';
import { Function, Node, Ref, Struct, Tag } from '../ast/nodes';
import { unimplemented } from '../utils';

// class TypeSystem {
//     readonly fmt: Formatter;
//     readonly types: Array<Node | null>
// 
//     constructor(readonly ctx: Ctx) {
//         this.fmt = new Formatter(ctx);
//         this.types = new Array(ctx.nodes.length).fill(null);
//     }
// 
//     process() {
//         const ctx = this.ctx;
//         const types = this.types;
//         const fmt = this.fmt;
//         const nodes = this.ctx.nodes;
// 
//         for (let id = 0; id < nodes.length; id++) {
//             const node = nodes[id];
// 
//             switch (node.tag) {
//                 case Tag.BlockAttribute: {
//                     types[id] = null;
//                     break;
//                 }
// 
//                 case Tag.Struct: {
//                     types[id] = node;
//                     break;
//                 }
// 
//                 case Tag.Function: {
//                     types[id] = node;
//                     break;
//                 }
// 
//                 case Tag.Constant: {
//                     types[id] = node.type;
//                     break;
//                 }
//                     
//                 case Tag.Call: {
//                     // Lookup the call
//                     if (node.target.tag === Tag.RefIds) {
//                         const args = node.args.map(arg => types[arg.targetId]!);
// 
//                         console.log(args.map(arg => fmt.formatRef(arg)));
// 
//                         // Check for the best call
//                         for (const fnId of node.target.target) {
//                             const fn = ctx.nodes[fnId] as Function;
//                             
//                             const params = fn.parameters.map(arg => types[arg.targetId]!);
// 
//                             if (ctx.get(params[0] as any) === ctx.get(args[0] as any)) {
//                                 (node as any).target = new RefLocal(fnId);
//                             }
// 
//                             console.log(params.map(param => fmt.formatRef(param)));
//                         }
//                     }
// 
//                     const target = ctx.get(node.target);
//                     types[id] = target.returnType;
//                     break;
//                 }
// 
//                 case Tag.Return: {
//                     types[id] = node.value === null ? null : types[node.value.targetId];
//                     break;
//                 }
// 
//                 case Tag.Variable: {
//                     types[id] = node.type;
//                     break;
//                 }
//                     
//                 case Tag.Get: {
//                     types[id] = null;
// 
//                     switch (node.source.tag) {
//                         case Tag.RefLocal:      types[id] = types[node.source.targetId]; break;
//                         case Tag.RefUp: types[id] = types[node.source.targetId]; break;
//                         case Tag.RefGlobal:  types[id] = types[node.source.targetId]; break;
//                     
//                         case Tag.RefFieldName: {
//                             // Get the type of left
//                             const type = this.ctx.get(this.getType(node.source.object) as any) as Struct;
// 
//                             for (const ref of type.body) {
//                                 const member = this.ctx.get(ref);
//                                 if (member.tag === Tag.Variable && member.name === node.source.target) {
//                                     types[id] = member.type;
//                                     // Overwrite the node.
//                                     (node as any).source = new RefField(node.source.object, member.id);
//                                 }
//                             }
//                         }
//                     }
// 
//                     break;
//                 }
// 
//                 case Tag.Set: {
//                     const variable = ctx.get(node.target);
//                     
//                     if (variable.type.tag === Tag.RefInfer) {
//                         (variable as any).type = types[node.source.targetId];
//                         types[variable.id] = types[node.source.targetId];
//                     }
// 
//                     types[id] = types[node.source.targetId];
// 
//                     break;
//                 }
// 
//                 case Tag.Construct: {
//                     types[id] = node.target;
//                     break;
//                 }
// 
//                 default: {
//                     console.log(Tag[node.tag]);
//                 }
//             }
//         }
// 
//         console.log('==================================================')
//         console.log(fmt.formatBody(ctx.root));
//         console.log('--------------------------------------------------')
// 
//         for (let id = ctx.builtins.count; id < nodes.length; id++) {
//             const node = nodes[id];
//             const type = types[id];
// 
//             console.log(`${fmt.formatRef(node)} :: ${type === null ? '<unknown>' : fmt.formatRef(type)}`);
//         }
//         console.log('==================================================')
//     }
// 
//     getType<T>(ref: Ref<T>) {
//         throw unimplemented(ref as never);
//     }
// }

export function handleTypes(ctx: Ctx) {
    // const ts = new TypeSystem(ctx);
    // ts.process();
}