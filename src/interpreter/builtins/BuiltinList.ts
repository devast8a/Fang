export class BuiltinList {
    private readonly values: Array<number> = [];

    get size() {
        return this.values.length;
    }

    push(value: any) {
        this.values.push(value);
    }

    ['operator[]'](index: any[]) {
        return this.values[index[0]];
    }

    ['operator[]='](index: any[], value: any) {
        return this.values[index[0]] = value;
    }
}