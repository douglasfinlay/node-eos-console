import {
    EosConsole,
    GetRecordTargetListProgressCallback,
} from '../eos-console';
import { TargetNumber } from '../eos-types';
import { Preset } from '../record-targets';
import { PresetRequest } from '../requests';
import { EosRecordTargetModule } from './eos-record-target-module';

export class PresetsModule extends EosRecordTargetModule<'preset'> {
    constructor(eos: EosConsole) {
        super(eos, 'preset');
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
        return await this.eos.request(PresetRequest.get(targetNumber));
    }
}
