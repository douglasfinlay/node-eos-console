import { TargetNumber } from '../eos-types';
import { OscMessage } from '../osc';
import { Effect } from '../record-targets';
import {
    RecordTargetRequest,
    unpackBaseRecordTarget,
} from './record-target-request';

export class EffectRequest extends RecordTargetRequest<Effect> {
    static index(index: number) {
        return new EffectRequest(`/eos/get/fx/index/${index}`);
    }

    static get(targetNumber: TargetNumber) {
        return new EffectRequest(`/eos/get/fx/${targetNumber}`);
    }

    protected override unpack(messages: OscMessage[]): Effect {
        return {
            targetType: 'fx',
            targetNumber: Number(messages[0].address.split('/')[5]),
            ...unpackBaseRecordTarget(messages[0]),
            effectType: messages[0].args[3].getString(),
            entry: messages[0].args[4].getString(),
            exit: messages[0].args[5].getString(),
            duration: messages[0].args[6].getString(),
            scale: messages[0].args[7].getInteger(),
        };
    }
}
