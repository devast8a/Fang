import { unimplemented } from '../../utils';

export class VmInstance {
    constructor(
        private readonly fields: Map<number, any>,
    ) { }

    getField(id: number) {
        return this.fields.get(id);
    }
    
    setField(id: number, value: any) {
        return this.fields.set(id, value);
    }

    getIndex(key: any[]) {
        throw unimplemented('getIndex not implemented');
    }

    setIndex(key: any[], value: any) {
        throw unimplemented('setIndex not implemented');
    }
}
