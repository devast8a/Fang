import { Struct } from '../../ast/nodes';
import { Environment } from '../Environment';
import { NativeInstance } from './NativeInstance';

export class NativeStruct {
    constructor(
        readonly env: Environment,
        readonly struct: Struct,
        readonly ctor: { new(...args: any[]): any },
        readonly mapping: Map<number, string>,
    ) { }

    construct() {
        return new NativeInstance(
            this.mapping,
            new this.ctor(),
        )
    }
}