import { GetRecordTargetListProgressCallback } from '../eos-console';
import { TargetNumber } from '../eos-types';
import { Group } from '../record-targets';
import { GroupRequest } from '../requests';
import { RecordTargetModule } from './record-target-module';

export class GroupsModule extends RecordTargetModule<'group'> {
    constructor() {
        super('group');
    }

    async getAll(
        progressCallback?: GetRecordTargetListProgressCallback,
    ): Promise<Group[]> {
        return this.getRecordTargetList(
            'group',
            i => GroupRequest.index(i),
            progressCallback,
        );
    }

    async get(targetNumber: TargetNumber): Promise<Group | null> {
        return this.getEos().request(GroupRequest.get(targetNumber));
    }
}
