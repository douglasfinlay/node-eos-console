import { TargetNumber } from '../eos-types';
import { OscMessage } from '../osc';
import { Macro } from '../record-targets';
import {
    RecordTargetRequest,
    unpackBaseRecordTarget,
} from './record-target-request';

export class MacroRequest extends RecordTargetRequest<Macro> {
    static index(index: number) {
        return new MacroRequest(`/eos/get/macro/index/${index}`, 2);
    }

    static get(targetNumber: TargetNumber) {
        return new MacroRequest(`/eos/get/macro/${targetNumber}`, 2);
    }

    protected override unpack(messages: OscMessage[]): Macro {
        return {
            targetType: 'macro',
            targetNumber: Number(messages[0].address.split('/')[5]),
            ...unpackBaseRecordTarget(messages[0]),
            mode: messages[0].args[3].getString(),
            command: messages[1].args
                .slice(2)
                .map(arg => arg.getString())
                .join(''),
        };
    }
}
