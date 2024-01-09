import {
    EosConsole,
    GetRecordTargetListProgressCallback,
} from '../eos-console';
import { TargetNumber } from '../eos-types';
import { Curve } from '../record-targets';
import { CurveRequest } from '../requests';
import { EosRecordTargetModule } from './eos-record-target-module';

export class CurvesModule extends EosRecordTargetModule<'curve'> {
    constructor(eos: EosConsole) {
        super(eos, 'curve');
    }

    async getAll(
        progressCallback?: GetRecordTargetListProgressCallback,
    ): Promise<Curve[]> {
        return this.getRecordTargetList(
            'curve',
            i => CurveRequest.index(i),
            progressCallback,
        );
    }

    async get(targetNumber: TargetNumber): Promise<Curve | null> {
        return await this.eos.request(CurveRequest.get(targetNumber));
    }
}
