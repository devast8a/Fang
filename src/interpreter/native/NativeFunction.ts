import { NativeInstance } from './NativeInstance';

export class NativeFunction {
    constructor(
        private readonly fn: (...args: any[]) => any,
    ) { }

    call(self: any, args: any[]) {
        if (self === null) {
            return this.fn.apply(self, args);
        }

        if (self instanceof NativeInstance) {
            return this.fn.apply(self.value, args);
        }
    
        throw new Error('Not applied to a NativeInstance');
    }
}