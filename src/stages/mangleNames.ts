import { VisitDecls } from '../ast/VisitDecls';
import { createVisitor } from '../ast/visitor';
import { Tag } from '../nodes';

export const mangleNames = createVisitor(VisitDecls, (node, context) => {
    // TODO: Don't mutate nodes
    switch (node.tag) {
        case Tag.DeclFunction: {
            const name = mangleSymbols(node.name);
            node.name = `FF_${name}`;
            return node;
        }

        case Tag.DeclStruct: {
            const name = mangleSymbols(node.name);
            node.name = `FS_${name}`;
            return node;
        }

        case Tag.DeclTrait: {
            const name = mangleSymbols(node.name);
            node.name = `FT_${name}`;
            return node;
        }
    }

    return node;
});

function mangleSymbols(name: string) {
    return name.replace(/[^a-zA-Z0-9]/gu, (symbol) => {
        const code = symbol.charCodeAt(0);
        return `_${code}`
    });
}