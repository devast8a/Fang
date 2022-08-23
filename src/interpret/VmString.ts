import { inspect } from 'util';
import { assert } from '../utils';

export class VmString {
    constructor(readonly value: string) { }

    static from(value: any) {
        return new VmString(value.toString());
    }

    reverse() {
        return new VmString(this.value.split('').reverse().join(''));
    }

    strip() {
        return new VmString(this.value.trim());
    }

    replace(value: string, replace: string) {
        return new VmString(this.value.replace(new RegExp(value, 'g'), replace));
    }

    get size() {
        return this.value.length;
    }

    getCode(nth: number) {
        return this.value.charCodeAt(nth);
    }

    toString() {
        return this.value;
    }

    [inspect.custom]() {
        return this.value;
    }

    ['infix+'](right: any) {
        if (right instanceof VmString) {
            return VmString.from(this.value + right.value);
        }

        if (typeof right === 'string') {
            return VmString.from(this.value + right);
        }

        // TODO: Create a better error system
        throw new Error('Strings do not support infix+ with right hand side');
    }
}
