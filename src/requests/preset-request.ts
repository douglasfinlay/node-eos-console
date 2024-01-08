import { TargetNumber } from '../eos-types';
import { OscMessage } from '../osc';
import { Preset } from '../record-targets';
import {
    RecordTargetRequest,
    unpackBaseRecordTarget,
} from './record-target-request';

export class PresetRequest extends RecordTargetRequest<Preset> {
    static index(index: number) {
        return new PresetRequest(`/eos/get/preset/index/${index}`, 4);
    }

    static get(targetNumber: TargetNumber) {
        return new PresetRequest(`/eos/get/preset/${targetNumber}`, 4);
    }

    protected override unpack(messages: OscMessage[]): Preset {
        return {
            targetType: 'preset',
            targetNumber: Number(messages[0].address.split('/')[5]),
            ...unpackBaseRecordTarget(messages[0]),
            absolute: messages[0].args[3].getBoolean(),
            locked: messages[0].args[4].getBoolean(),
            channels: messages[1].args
                .slice(2)
                .flatMap(arg => arg.getTargetNumberRange()),
            byTypeChannels: messages[2].args
                .slice(2)
                .flatMap(arg => arg.getTargetNumberRange()),
            effects: messages[3].args
                .slice(2)
                .flatMap(arg => arg.getTargetNumberRange()),
        };
    }
}
