import { GetRecordTargetListProgressCallback } from '../eos-console';
import { TargetNumber } from '../eos-types';
import { CueList } from '../record-targets';
import { CueListRequest } from '../requests';
import { RecordTargetModule } from './record-target-module';

export class CueListsModule extends RecordTargetModule<'cuelist'> {
    constructor() {
        super('cuelist');
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

    async get(targetNumber: TargetNumber): Promise<CueList | null> {
        return this.getEos().request(CueListRequest.get(targetNumber));
    }
}
