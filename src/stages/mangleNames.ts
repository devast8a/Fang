import { VisitDecls } from '../ast/VisitDecls';
import { createVisitor } from '../ast/visitor';
import { Tag } from '../nodes';

export const mangleNames = createVisitor(VisitDecls, (node, context) => {
    // TODO: Don't mutate nodes
    switch (node.tag) {
        case Tag.DeclFunction: {
            node.name = `FF_${node.name}`;
            return node;
        }

        case Tag.DeclStruct: {
            node.name = `FS_${node.name}`;
            return node;
        }

        case Tag.DeclTrait: {
            node.name = `FT_${node.name}`;
            return node;
        }
    }

    return node;
});