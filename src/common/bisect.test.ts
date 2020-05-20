import {bisect} from './bisect';

import {expect} from 'chai';
import 'mocha';

describe('bisect', () => {
    it('should return 0 for an empty array', () => {
        const result = bisect(new Array<number>(), () => false);

        expect(result).equals(0);
    });

    it('should return array length if all elements fail predicate', () => {
        const result = bisect([1, 2, 3, 4, 5], () => false);

        expect(result).equals(5);
    });

    it('should return zero if all elements pass predicate', () => {
        const result = bisect([1, 2, 3, 4, 5], () => true);

        expect(result).equals(0);
    });

    it('should find the first point predicate switches to true', () => {
        const result = bisect([1, 2, 3, 4, 5], (x) => x > 2);

        expect(result).equals(2);
    });
});
