import {
    EosConsole,
    GetRecordTargetListProgressCallback,
} from '../eos-console';
import { CueList } from '../record-targets';
import { CueListRequest } from '../requests';
import { EosRecordTargetModule } from './eos-record-target-module';

export class CueListsModule extends EosRecordTargetModule<'cuelist'> {
    constructor(eos: EosConsole) {
        super(eos, 'cuelist');
    }

    async getAll(
        progressCallback?: GetRecordTargetListProgressCallback,
    ): Promise<CueList[]> {
        return this.getRecordTargetList(
            'cuelist',
            i => CueListRequest.index(i),
            progressCallback,
        );
    }

    async get(targetNumber: number): Promise<CueList | null> {
        return await this.eos.request(CueListRequest.get(targetNumber));
    }
}
