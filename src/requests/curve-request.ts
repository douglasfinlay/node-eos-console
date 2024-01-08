import { TargetNumber } from '../eos-types';
import { OscMessage } from '../osc';
import { Curve } from '../record-targets';
import {
    RecordTargetRequest,
    unpackBaseRecordTarget,
} from './record-target-request';

export class CurveRequest extends RecordTargetRequest<Curve> {
    static index(index: number) {
        return new CurveRequest(`/eos/get/curve/index/${index}`);
    }

    static get(targetNumber: TargetNumber) {
        return new CurveRequest(`/eos/get/curve/${targetNumber}`);
    }

    protected override unpack(messages: OscMessage[]): Curve {
        return {
            targetType: 'curve',
            targetNumber: Number(messages[0].address.split('/')[5]),
            ...unpackBaseRecordTarget(messages[0]),
        };
    }
}
