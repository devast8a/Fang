import { Register, Visitor } from '../ast/visitor';
import { RNode, RNodes } from '../nodes/resolved/RNode';
import { RTag } from '../nodes/resolved/RTag';
import { RType } from '../nodes/resolved/RType';

class TypeError {

}

export class TypeChecker extends Visitor<RNode, [Array<TypeError>], void> {
    public constructor() {
        super(RTag, setup);
    }

    public check(node: RNode, errors: Array<TypeError>): void
    public check(nodes: RNode[], errors: Array<TypeError>): void
    public check(nodes: RNode | RNode[], errors: Array<TypeError>): void {
        if (nodes instanceof Array) {
            for (const node of nodes) {
                this.visit(node, errors);
            }
        } else {
            this.visit(nodes, errors);
        }
    }
}

function setup(reg: Register<TypeChecker, RNode, [Array<TypeError>], void>) {
    reg(RNodes.DeclClass, (node, checker, errors) => {
        // TODO: Check class implements all traits correctly
        for (const member of node.members) {
            checker.check(member, errors);
        }
    });

    reg(RNodes.DeclFunction, (node, checker, errors) => {
        for (const child of node.body) {
            checker.check(child, errors);
        }
    });

    reg(RNodes.DeclTrait, (node, checker) => {
        // TODO: Implement type checking for traits
    });

    reg(RNodes.DeclVariable, (node, checker, errors) => {
        if (node.value !== null && !RType.isSameType(node.type, node.value.resultType)) {
            errors.push(new TypeError());
        }
    });

    reg(RNodes.ExprCallField, (node, checker, errors) => {
        const args = node.args;
        const parameters = node.target.parameters;

        for (let index = 0; index < args.length; index++) {
            if (!RType.isSubType(args[index].resultType, parameters[index].type)) {
                errors.push(new TypeError());
            }

            checker.check(args[index], errors);
        }
    });

    reg(RNodes.ExprCallStatic, (node, checker, errors) => {
        const args = node.args;
        const parameters = node.target.parameters;

        for (let index = 0; index < args.length; index++) {
            if (!RType.isSubType(args[index].resultType, parameters[index].type)) {
                errors.push(new TypeError());
            }

            checker.check(args[index], errors);
        }
    });

    reg(RNodes.ExprConstant, (node, checker, errors) => {}); // Nothing to check
    reg(RNodes.ExprGetField, (node, checker, errors) => {}); // Nothing to check
    reg(RNodes.ExprGetLocal, (node, checker, errors) => {}); // Nothing to check

    reg(RNodes.ExprSetField, (node, checker, errors) => {
        if (!RType.isSameType(node.field.type, node.value.resultType)) {
            errors.push(new TypeError());
        }
    });

    reg(RNodes.ExprSetLocal, (node, checker, errors) => {
        if (!RType.isSameType(node.local.type, node.value.resultType)) {
            errors.push(new TypeError());
        }
    });

    // RGeneric
    // RGenericApply
    // RGenericParameter

    reg(RNodes.StmtIf, (node, checker, errors) => {
        checker.check(node.cases, errors);
        checker.check(node.final, errors);
    });

    reg(RNodes.StmtIfCase, (node, checker, errors) => {
        // TODO: Check condition is a boolean
        checker.check(node.condition, errors);
        checker.check(node.body, errors);
    });

    reg(RNodes.StmtReturn, (node, checker, errors) => {
        if (node.value !== null) {
            checker.check(node.value, errors);
        }
    });

    reg(RNodes.StmtWhile, (node, checker, errors) => {
        // TODO: Check condition is a boolean
        checker.check(node.condition, errors);
        checker.check(node.body, errors);
    });
}
