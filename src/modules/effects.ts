import { GetRecordTargetListProgressCallback } from '../eos-console';
import { TargetNumber } from '../eos-types';
import { Effect } from '../record-targets';
import { EffectRequest } from '../requests';
import { RecordTargetModule } from './record-target-module';

export class EffectsModule extends RecordTargetModule<'fx'> {
    constructor() {
        super('fx');
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
        return this.getEos().request(EffectRequest.get(targetNumber));
    }
}
