import {
    EosConsole,
    GetRecordTargetListProgressCallback,
} from '../eos-console';
import { Group } from '../record-targets';
import { GroupRequest } from '../requests';
import { EosRecordTargetModule } from './eos-record-target-module';

export class GroupsModule extends EosRecordTargetModule<'group'> {
    constructor(eos: EosConsole) {
        super(eos, 'group');
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

    async get(targetNumber: number): Promise<Group | null> {
        return await this.eos.request(GroupRequest.get(targetNumber));
    }
}
