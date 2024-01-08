import { TargetNumber } from '../eos-types';
import { OscMessage } from '../osc';
import { CueList } from '../record-targets';
import {
    RecordTargetRequest,
    unpackBaseRecordTarget,
} from './record-target-request';

export class CueListRequest extends RecordTargetRequest<CueList> {
    static index(index: number) {
        return new CueListRequest(`/eos/get/cuelist/index/${index}`, 2);
    }

    static get(targetNumber: TargetNumber) {
        return new CueListRequest(`/eos/get/cuelist/${targetNumber}`, 2);
    }

    protected override unpack(messages: OscMessage[]): CueList {
        return {
            targetType: 'cuelist',
            targetNumber: Number(messages[0].address.split('/')[5]),
            ...unpackBaseRecordTarget(messages[0]),
            playbackMode: messages[0].args[3].getString(),
            faderMode: messages[0].args[4].getString(),
            independent: messages[0].args[5].getBoolean(),
            htp: messages[0].args[6].getBoolean(),
            assert: messages[0].args[7].getBoolean(),
            block: messages[0].args[8].getBoolean(),
            background: messages[0].args[9].getBoolean(),
            solo: messages[0].args[10].getBoolean(),
            timecodeList: messages[0].args[11].getOptionalInteger(),
            oosSync: messages[0].args[12].getBoolean(),
            linkedCueLists: messages[1].args
                .slice(2)
                .flatMap(arg => arg.getTargetNumberRange()),
        };
    }
}
