import { GetRecordTargetListProgressCallback } from '../eos-console';
import { TargetNumber } from '../eos-types';
import { Preset } from '../record-targets';
import { PresetRequest } from '../requests';
import { RecordTargetModule } from './record-target-module';

export class PresetsModule extends RecordTargetModule<'preset'> {
    constructor() {
        super('preset');
    }

    async getAll(
        progressCallback?: GetRecordTargetListProgressCallback,
    ): Promise<Preset[]> {
        return this.getRecordTargetList(
            'preset',
            i => PresetRequest.index(i),
            progressCallback,
        );
    }

    async get(targetNumber: TargetNumber): Promise<Preset | null> {
        return this.getEos().request(PresetRequest.get(targetNumber));
    }
}
