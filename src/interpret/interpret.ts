import { Decl, DeclFunction, DeclVariable, Expr, ExprConstant, ExprId, ExprIfCase, Module, Node, Ref, RefGlobal, RefLocal, Tag } from '../nodes';

export type VMFunction = number;

export class Frame {
    public constructor(
        public globals: ReadonlyArray<Decl | Ref>,
        public decls: ReadonlyArray<Decl | Ref>,
        public exprs: ReadonlyArray<Expr>,
        public locals: Array<any>,
    ) { }

    public run = true;
}

export class VirtualMachine {
    public constructor(
        public module: Module
    ) { }

    public stack = new Array<Frame>();

    public getFunction(name: string): VMFunction | null {
        const ids = this.module.children.names.get(name);
        if (ids === undefined || ids.length !== 1) {
            return null;
        }
        return ids[0];
    }

    public call(id: VMFunction) {
        const fn = Node.as(this.module.children.decls[id], DeclFunction);

        // Note: decls.length is greater than the number of locals we need to support a nested class/function
        //  declaration is still marked as a decl but won't need a slot on the stack.
        const frame = new Frame(
            this.module.children.decls,
            fn.children.decls,
            fn.children.exprs,
            new Array(fn.children.decls),
        );

        // eslint-disable-next-line no-empty
        return evaluateBody(frame, fn.children.body);
    }

}

function evaluateBody(context: Frame, ids: ReadonlyArray<ExprId>) {
    for (const id of ids) {
        const value = evaluate(context, id);

        if (!context.run) {
            context.run = true;
            return value;
        }
    }
}

function evaluate(context: Frame, id: ExprId): any {
    const expr = context.exprs[id];
    const { globals, exprs, decls, locals } = context;

    switch (expr.tag) {
        case Tag.ExprCall: {
            const target = globals[(expr.target as RefGlobal).id] as DeclFunction;
            switch (target.name) {
                case 'infix+': return evaluate(context, expr.args[0]) + evaluate(context, expr.args[1]);
                case 'infix<': return evaluate(context, expr.args[0]) < evaluate(context, expr.args[1]);
                case 'infix%': return evaluate(context, expr.args[0]) % evaluate(context, expr.args[1]);
                case 'infix==': return evaluate(context, expr.args[0]) === evaluate(context, expr.args[1]);
                default: throw new Error(`Unreachable: Unhandled case ${target.name}`);
            }
        }
            
        case Tag.ExprConstant: {
            return expr.value;
        }

        case Tag.ExprDeclaration: {
            const target = (expr.target as RefLocal).id;
            const variable = Node.as(decls[target], DeclVariable);
            const value = Node.as(exprs[variable.value!], ExprConstant).value;
            locals[target] = value;
            return null;
        }
            
        case Tag.ExprGet: {
            const target = (expr.target as RefLocal).id;
            return locals[target];
        }

        case Tag.ExprIf: {
            for (const id of expr.cases) {
                const { condition, body } = exprs[id] as ExprIfCase;

                if (condition === null || evaluate(context, condition)) {
                    evaluateBody(context, body);
                    break;
                }
            }
            return null;
        }
            
        case Tag.ExprReturn: {
            if (expr.value !== null) {
                const value = evaluate(context, expr.value);
                context.run = false;
                return value;
            }

            context.run = false;
            return null;
        }
            
        case Tag.ExprSet: {
            const target = (expr.target as RefLocal).id;
            locals[target] = evaluate(context, expr.value);
            return null;
        }
            
        case Tag.ExprWhile: {
            while (evaluate(context, expr.condition)) {
                evaluateBody(context, expr.body);
            }
            return null;
        }

        default: {
            throw new Error(`Unreachable: Unhandled case ${Tag[(expr as any).tag]}`);
        }
    }
}