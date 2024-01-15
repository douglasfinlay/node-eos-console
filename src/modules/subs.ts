import { GetRecordTargetListProgressCallback } from '../eos-console';
import { TargetNumber } from '../eos-types';
import { Sub } from '../record-targets';
import { SubRequest } from '../requests';
import { RecordTargetModule } from './record-target-module';

export class SubsModule extends RecordTargetModule<'sub'> {
    constructor() {
        super('sub');
    }

    async getAll(
        progressCallback?: GetRecordTargetListProgressCallback,
    ): Promise<Sub[]> {
        return this.getRecordTargetList(
            'sub',
            i => SubRequest.index(i),
            progressCallback,
        );
    }

    async get(targetNumber: TargetNumber): Promise<Sub | null> {
        return this.getEos().request(SubRequest.get(targetNumber));
    }
}
