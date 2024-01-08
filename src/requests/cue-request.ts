import { TargetNumber } from '../eos-types';
import { OscMessage } from '../osc';
import { Cue } from '../record-targets';
import {
    RecordTargetRequest,
    unpackBaseRecordTarget,
} from './record-target-request';

export class CueRequest extends RecordTargetRequest<Cue> {
    static index(index: number, cueList: TargetNumber) {
        return new CueRequest(
            `/eos/get/cue/${cueList}/noparts/index/${index}`,
            4,
        );
    }

    static get(targetNumber: TargetNumber, cueList: TargetNumber) {
        return new CueRequest(`/eos/get/cue/${cueList}/${targetNumber}/0`, 4);
    }

    protected override unpack(messages: OscMessage[]): Cue {
        return {
            targetType: 'cue',
            targetNumber: Number(messages[0].address.split('/')[6]),
            ...unpackBaseRecordTarget(messages[0]),
            upTimeDurationMs: messages[0].args[3].getInteger(),
            upTimeDelayMs: messages[0].args[4].getInteger(),
            downTimeDurationMs: messages[0].args[5].getOptionalInteger(),
            downTimeDelayMs: messages[0].args[6].getOptionalInteger(),
            focusTimeDurationMs: messages[0].args[7].getOptionalInteger(),
            focusTimeDelayMs: messages[0].args[8].getOptionalInteger(),
            colorTimeDurationMs: messages[0].args[9].getOptionalInteger(),
            colorTimeDelayMs: messages[0].args[10].getOptionalInteger(),
            beamTimeDurationMs: messages[0].args[11].getOptionalInteger(),
            beamTimeDelayMs: messages[0].args[12].getOptionalInteger(),
            preheat: messages[0].args[13].getBoolean(),
            curve: messages[0].args[14].getTargetNumber(),
            rate: messages[0].args[15].getInteger(),
            mark: messages[0].args[16].getString(),
            block: messages[0].args[17].getString(),
            assert: messages[0].args[18].getString(),
            link: messages[0].args[19].getTargetNumber(),
            followTimeMs: messages[0].args[20].getOptionalInteger(),
            hangTimeMs: messages[0].args[21].getOptionalInteger(),
            allFade: messages[0].args[22].getBoolean(),
            loop: messages[0].args[23].getOptionalInteger(),
            solo: messages[0].args[24].getBoolean(),
            timecode: messages[0].args[25].getString(),
            partCount: messages[0].args[26].getInteger(),
            notes: messages[0].args[27].getString(),
            scene: messages[0].args[28].getString(),
            sceneEnd: messages[0].args[29].getBoolean(),
            cuePartIndex: messages[0].args[30].getOptionalInteger(),
            effects: messages[1].args
                .slice(2)
                .flatMap(arg => arg.getTargetNumberRange()),
            linkedCueLists: messages[2].args
                .slice(2)
                .flatMap(arg => arg.getTargetNumberRange()),
            externalLinkAction: messages[3].args[2]?.getString() ?? null,
        };
    }
}
