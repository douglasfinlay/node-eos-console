import { GetRecordTargetListProgressCallback } from '../eos-console';
import { TargetNumber } from '../eos-types';
import { Snapshot } from '../record-targets';
import { SnapshotRequest } from '../requests';
import { RecordTargetModule } from './record-target-module';

export class SnapshotsModule extends RecordTargetModule<'snap'> {
    constructor() {
        super('snap');
    }

    async getAll(
        progressCallback?: GetRecordTargetListProgressCallback,
    ): Promise<Snapshot[]> {
        return this.getRecordTargetList(
            'snap',
            i => SnapshotRequest.index(i),
            progressCallback,
        );
    }

    async get(targetNumber: TargetNumber): Promise<Snapshot | null> {
        return this.getEos().request(SnapshotRequest.get(targetNumber));
    }
}
