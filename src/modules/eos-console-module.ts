import { Request } from '../requests';

export interface EosConsoleModuleContext {
    readonly version: string;

    request<T>(request: Request<T>): Promise<T>;
    sendMessage: (address: string, args?: unknown[]) => Promise<void>;
}

export abstract class EosConsoleModule {
    private eos: EosConsoleModuleContext | null = null;

    protected getEos(): EosConsoleModuleContext {
        if (!this.eos) {
            throw new Error('module not initialised');
        }

        return this.eos;
    }

    /**
     * @internal
     */
    init(eos: EosConsoleModuleContext) {
        this.eos = eos;
    }

    /**
     * @internal
     */
    destroy() {
        this.eos = null;
    }
}
