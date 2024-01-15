import { GetRecordTargetListProgressCallback } from '../eos-console';
import { TargetNumber } from '../eos-types';
import { Curve } from '../record-targets';
import { CurveRequest } from '../requests';
import { RecordTargetModule } from './record-target-module';

export class CurvesModule extends RecordTargetModule<'curve'> {
    constructor() {
        super('curve');
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
        return this.getEos().request(CurveRequest.get(targetNumber));
    }
}
