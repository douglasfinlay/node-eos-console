import { GetRecordTargetListProgressCallback } from '../eos-console';
import { TargetNumber } from '../eos-types';
import { MagicSheet } from '../record-targets';
import { MagicSheetRequest } from '../requests';
import { RecordTargetModule } from './record-target-module';

export class MagicSheetsModule extends RecordTargetModule<'ms'> {
    constructor() {
        super('ms');
    }

    async getAll(
        progressCallback?: GetRecordTargetListProgressCallback,
    ): Promise<MagicSheet[]> {
        return this.getRecordTargetList(
            'ms',
            i => MagicSheetRequest.index(i),
            progressCallback,
        );
    }

    async get(targetNumber: TargetNumber): Promise<MagicSheet | null> {
        return this.getEos().request(MagicSheetRequest.get(targetNumber));
    }
}
