import {
    EosConsole,
    GetRecordTargetListProgressCallback,
} from '../eos-console';
import { Snapshot } from '../record-targets';
import { SnapshotRequest } from '../requests';
import { EosRecordTargetModule } from './eos-record-target-module';

export class SnapshotsModule extends EosRecordTargetModule<'snap'> {
    constructor(eos: EosConsole) {
        super(eos, 'snap');
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

    async get(targetNumber: number): Promise<Snapshot | null> {
        return await this.eos.request(SnapshotRequest.get(targetNumber));
    }
}
