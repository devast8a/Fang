import {LineMap, LineAnchor} from './linemap';

import {expect} from 'chai';
import 'mocha';

describe("LineMap", () => {
    it("should correctly generate entries", () => {
        const map = new LineMap("ABC\n123\nXYZ");

        expect(map.entries).deep.equal([
            {start: 0, endContent:  3, endNewLine:  4, line: 0, newline: '\n'},
            {start: 4, endContent:  7, endNewLine:  8, line: 1, newline: '\n'},
            {start: 8, endContent: 11, endNewLine: 11, line: 2, newline: ''},
        ]);
    });

    it("queryToLineColumn", () => {
        const map = new LineMap("ABC\n123\nXYZ");
        const expected = {line: 1, column: 0};

        expect(map.queryToLineColumn({offset: 4})).deep.equals(expected);
        expect(map.queryToLineColumn({line: 1}, LineAnchor.Start)).deep.equals(expected);
        expect(map.queryToLineColumn({line: 1, column: 0})).deep.equals(expected);
        expect(() => map.queryToLineColumn({} as any)).throws("Invalid query");
    });

    it("queryToOffset", () => {
        const map = new LineMap("ABC\n123\nXYZ");
        const expected = 4;

        expect(map.queryToOffset({offset: 4})).deep.equals(expected);
        expect(map.queryToOffset({line: 1}, LineAnchor.Start)).deep.equals(expected);
        expect(map.queryToOffset({line: 1, column: 0})).deep.equals(expected);
        expect(() => map.queryToOffset({} as any)).throws("Invalid query");
    });

    it("queryToEntry", () => {
        const map = new LineMap("ABC\n123\nXYZ");
        const expected = {start: 4, endContent:  7, endNewLine:  8, line: 1, newline: '\n'};

        expect(map.queryToEntry({offset: 4})).deep.equals(expected);
        expect(map.queryToEntry({line: 1})).deep.equals(expected);
        expect(map.queryToEntry({line: 1, column: 0})).deep.equals(expected);
        expect(() => map.queryToEntry({} as any)).throws("Invalid query");
    });

    it("LineAnchor should return offsets ", () => {
        const map = new LineMap("ABC\n123\nXYZ");

        expect(map.queryToOffset({line: 1}, LineAnchor.Start)).equal(4);
        expect(map.queryToOffset({line: 1}, LineAnchor.EndContent)).equal(7);
        expect(map.queryToOffset({line: 1}, LineAnchor.EndNewLine)).equal(8);
    });
});