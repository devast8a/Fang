export enum ControlType {
    Break,
    Continue,
    Return,
}

export class Control {
    constructor(
        readonly type: ControlType,
        readonly value: any
    ) { }
}