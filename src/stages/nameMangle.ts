import { Visitor } from '../ast/visitor';
import { Tag } from '../nodes';

export const nameMangle = new Visitor({
    after: (node) => {
        switch (node.tag) {
            case Tag.Function: {
                const parameters = node.parameters.map(x => x.name).join('_');

                if (parameters.length > 0) {
                    node.name = `FF_${node.name}_${parameters}`;
                } else {
                    node.name = `FF_${node.name}`;
                }
            }
        }

        return node;
    }
});