import {
    EosConsole,
    GetRecordTargetListProgressCallback,
} from '../eos-console';
import { Sub } from '../record-targets';
import { SubRequest } from '../requests';
import { EosRecordTargetModule } from './eos-record-target-module';

export class SubsModule extends EosRecordTargetModule<'sub'> {
    constructor(eos: EosConsole) {
        super(eos, 'sub');
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

    async get(targetNumber: number): Promise<Sub | null> {
        return await this.eos.request(SubRequest.get(targetNumber));
    }
}
