export class VmEnvironment {
    private constructor(
        private readonly parent: VmEnvironment | null,
        public readonly locals: any[], // TODO: Mark as private after refactor
    ) { }
    
    public static create() {
        return new VmEnvironment(null, []);
    }

    public createChildEnvironment() {
        return new VmEnvironment(this, []);
    }

    public lookup(id: number, distance: number) {
        let env: VmEnvironment | null = this;
        while (distance-- > 0) {
            env = env?.parent ?? null;
        }

        if (env === null) {
            throw new Error();
        }

        return env.locals[id];
    }
}