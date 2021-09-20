import { Visitor } from '../ast/visitor';

export const checkType = new Visitor({
    after: (node, context) => {
        return node;
    }
});