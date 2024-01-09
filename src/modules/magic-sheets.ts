import {
    EosConsole,
    GetRecordTargetListProgressCallback,
} from '../eos-console';
import { TargetNumber } from '../eos-types';
import { MagicSheet } from '../record-targets';
import { MagicSheetRequest } from '../requests';
import { EosRecordTargetModule } from './eos-record-target-module';

export class MagicSheetsModule extends EosRecordTargetModule<'ms'> {
    constructor(eos: EosConsole) {
        super(eos, 'ms');
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
        return await this.eos.request(MagicSheetRequest.get(targetNumber));
    }
}
