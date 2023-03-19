import { assert } from '../../common/utils';

export class NativeInstance {
    constructor(
        // Mapping of Fang field ids to JavaScript field names
        private readonly mapping: Map<number, string>,
        public readonly value: any,
    ) { }

    public getField(id: number) {
        const name = this.mapping.get(id);
        assert(typeof name === 'string');
        return this.value[name];
    }

    public setField(id: number, value: any) {
        const name = this.mapping.get(id);
        assert(typeof name === 'string');
        this.value[name] = value;
    }

    public getIndex(index: any[]) {
        return this.value['operator[]'](index);
    }

    public setIndex(index: any[], value: any) {
        return this.value['operator[]='](index, value);
    }
}
