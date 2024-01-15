import { GetRecordTargetListProgressCallback } from '../eos-console';
import { TargetNumber } from '../eos-types';
import { Macro } from '../record-targets';
import { MacroRequest } from '../requests';
import { RecordTargetModule } from './record-target-module';

export class MacrosModule extends RecordTargetModule<'macro'> {
    constructor() {
        super('macro');
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

    async get(targetNumber: TargetNumber): Promise<Macro | null> {
        return this.getEos().request(MacroRequest.get(targetNumber));
    }
}
