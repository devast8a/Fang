import { expect } from 'chai';
import { Compile } from '..';

describe("Code Generation / C / Types", () => {
    it("Lowers function pointer variables correctly", () => {
        const code = Compile.string('fn main() -> void { val test: fn() -> void }');
        expect(code).contains("void (*test)();");
    });
});