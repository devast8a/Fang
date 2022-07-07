export type Constructor<Type = any, Parameters extends any[] = any, Prototype = any> = { new(...args: Parameters): Type, prototype: Prototype };