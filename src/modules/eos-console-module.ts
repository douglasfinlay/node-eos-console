import { EosConsole } from '../eos-console';

export abstract class EosConsoleModule {
    constructor(protected eos: EosConsole) {}
}
