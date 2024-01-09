import {
    EosConsole,
    GetRecordTargetListProgressCallback,
} from '../eos-console';
import { TargetNumber } from '../eos-types';
import { Effect } from '../record-targets';
import { EffectRequest } from '../requests';
import { EosRecordTargetModule } from './eos-record-target-module';

export class EffectsModule extends EosRecordTargetModule<'fx'> {
    constructor(eos: EosConsole) {
        super(eos, 'fx');
    }

    async getAll(
        progressCallback?: GetRecordTargetListProgressCallback,
    ): Promise<Effect[]> {
        return this.getRecordTargetList(
            'fx',
            i => EffectRequest.index(i),
            progressCallback,
        );
    }

    async get(targetNumber: TargetNumber): Promise<Effect | null> {
        return await this.eos.request(EffectRequest.get(targetNumber));
    }
}
