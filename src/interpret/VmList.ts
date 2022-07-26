export class VmList {
    public readonly values: Array<any>;

    public constructor(...values: any[]) {
        this.values = values
    }

    public get size() {
        return this.values.length;
    }
}