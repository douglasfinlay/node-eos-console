import {
    EosConsole,
    GetRecordTargetListProgressCallback,
} from '../eos-console';
import { Macro } from '../record-targets';
import { MacroRequest } from '../requests';
import { EosRecordTargetModule } from './eos-record-target-module';

export class MacrosModule extends EosRecordTargetModule<'macro'> {
    constructor(eos: EosConsole) {
        super(eos, 'macro');
    }

    async getAll(
        progressCallback?: GetRecordTargetListProgressCallback,
    ): Promise<Macro[]> {
        return this.getRecordTargetList(
            'macro',
            i => MacroRequest.index(i),
            progressCallback,
        );
    }

    async get(targetNumber: number): Promise<Macro | null> {
        return await this.eos.request(MacroRequest.get(targetNumber));
    }
}
