import { TargetNumber } from '../eos-types';
import { OscMessage } from '../osc';
import { Patch } from '../record-targets';
import {
    RecordTargetRequest,
    unpackBaseRecordTarget,
} from './record-target-request';

export class PatchRequest extends RecordTargetRequest<Patch> {
    static index(index: number) {
        return new PatchRequest(`/eos/get/patch/index/${index}`, 4);
    }

    static get(targetNumber: TargetNumber, partNumber: number): PatchRequest {
        return new PatchRequest(
            `/eos/get/patch/${targetNumber}/${partNumber}`,
            4,
        );
    }

    protected override unpack(messages: OscMessage[]): Patch {
        return {
            targetType: 'patch',
            targetNumber: Number(messages[0].address.split('/')[5]),
            partNumber: Number(messages[0].address.split('/')[6]),
            ...unpackBaseRecordTarget(messages[0]),
            fixtureManufacturer: messages[0].args[3].getString(),
            fixtureModel: messages[0].args[4].getString(),
            address: messages[0].args[5].getInteger(),
            intensityParameterAddress: messages[0].args[6].getInteger(),
            currentLevel: messages[0].args[7].getInteger(),
            gel: messages[0].args[8].getString(),
            text1: messages[0].args[9].getString(),
            text2: messages[0].args[10].getString(),
            text3: messages[0].args[11].getString(),
            text4: messages[0].args[12].getString(),
            text5: messages[0].args[13].getString(),
            text6: messages[0].args[14].getString(),
            text7: messages[0].args[15].getString(),
            text8: messages[0].args[16].getString(),
            text9: messages[0].args[17].getString(),
            text10: messages[0].args[18].getString(),
            partCount: messages[0].args[19].getInteger(),
            notes: messages[1].args[2].getString(),
        };
    }
}
