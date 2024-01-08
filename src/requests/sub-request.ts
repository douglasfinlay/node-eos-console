import { TargetNumber } from '../eos-types';
import { OscMessage } from '../osc';
import { Sub } from '../record-targets';
import {
    RecordTargetRequest,
    unpackBaseRecordTarget,
} from './record-target-request';

export class SubRequest extends RecordTargetRequest<Sub> {
    static index(index: number) {
        return new SubRequest(`/eos/get/sub/index/${index}`, 2);
    }

    static get(targetNumber: TargetNumber) {
        return new SubRequest(`/eos/get/snap/${targetNumber}`, 2);
    }

    protected override unpack(messages: OscMessage[]): Sub {
        return {
            targetType: 'sub',
            targetNumber: Number(messages[0].address.split('/')[5]),
            ...unpackBaseRecordTarget(messages[0]),
            mode: messages[0].args[3].getString(),
            faderMode: messages[0].args[4].getString(),
            htp: messages[0].args[5].getBoolean(),
            exclusive: messages[0].args[6].getBoolean(),
            background: messages[0].args[7].getBoolean(),
            restore: messages[0].args[8].getBoolean(),
            priority: messages[0].args[9].getString(),
            upTime: messages[0].args[10].getString(),
            dwellTime: messages[0].args[11].getString(),
            downTime: messages[0].args[12].getString(),
            effects: messages[1].args
                .slice(2)
                .flatMap(arg => arg.getTargetNumberRange()),
        };
    }
}
