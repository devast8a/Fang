import { unreachable } from '../common/utils';

export enum ControlType {
    Break,
    Continue,
    Return,
    End,
}

export enum ControlMode {
    Control,
    Value,
}

export class Control {
    constructor(
        readonly type: ControlType,
        readonly value: any
    ) { }

    static create(mode: ControlMode, type: ControlType, value: any): any {
        switch (mode) {
            case ControlMode.Value:   return value;
            case ControlMode.Control: return new Control(type, value);
            default: throw unreachable(mode);
        }
    }

    static pass(mode: ControlMode, control: Control) {
        switch (mode) {
            case ControlMode.Value:   return control.value;
            case ControlMode.Control: return control;
            default: throw unreachable(mode);
        }
    }
}