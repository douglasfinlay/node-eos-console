import { TargetNumber } from '../eos-types';
import { OscMessage } from '../osc';
import { Snapshot } from '../record-targets';
import {
    RecordTargetRequest,
    unpackBaseRecordTarget,
} from './record-target-request';

export class SnapshotRequest extends RecordTargetRequest<Snapshot> {
    static index(index: number) {
        return new SnapshotRequest(`/eos/get/snap/index/${index}`);
    }

    static get(targetNumber: TargetNumber) {
        return new SnapshotRequest(`/eos/get/snap/${targetNumber}`);
    }

    protected override unpack(messages: OscMessage[]): Snapshot {
        return {
            targetType: 'snap',
            targetNumber: Number(messages[0].address.split('/')[5]),
            ...unpackBaseRecordTarget(messages[0]),
        };
    }
}
