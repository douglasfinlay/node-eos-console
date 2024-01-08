import { TargetNumber } from '../eos-types';
import { OscMessage } from '../osc';
import { Group } from '../record-targets';
import {
    RecordTargetRequest,
    unpackBaseRecordTarget,
} from './record-target-request';

export class GroupRequest extends RecordTargetRequest<Group> {
    static index(index: number) {
        return new GroupRequest(`/eos/get/group/index/${index}`, 2);
    }

    static get(targetNumber: TargetNumber) {
        return new GroupRequest(`/eos/get/group/${targetNumber}`, 2);
    }

    protected override unpack(messages: OscMessage[]): Group {
        return {
            targetType: 'group',
            targetNumber: Number(messages[0].address.split('/')[5]),
            ...unpackBaseRecordTarget(messages[0]),
            channels: messages[1].args
                .slice(2)
                .flatMap(arg => arg.getTargetNumberRange()),
        };
    }
}
