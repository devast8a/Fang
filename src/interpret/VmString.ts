import { inspect } from 'util';

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
}
