import { TargetNumber } from '../eos-types';
import { OscMessage } from '../osc';
import { PixelMap } from '../record-targets';
import {
    RecordTargetRequest,
    unpackBaseRecordTarget,
} from './record-target-request';

export class PixelMapRequest extends RecordTargetRequest<PixelMap> {
    static index(index: number) {
        return new PixelMapRequest(`/eos/get/pixmap/index/${index}`, 2);
    }

    static get(targetNumber: TargetNumber) {
        return new PixelMapRequest(`/eos/get/pixmap/${targetNumber}`, 2);
    }

    protected override unpack(messages: OscMessage[]): PixelMap {
        return {
            targetType: 'pixmap',
            targetNumber: Number(messages[0].address.split('/')[5]),
            ...unpackBaseRecordTarget(messages[0]),
            serverChannel: messages[0].args[3].getInteger(),
            interface: messages[0].args[4].getString(),
            width: messages[0].args[5].getInteger(),
            height: messages[0].args[6].getInteger(),
            pixelCount: messages[0].args[7].getInteger(),
            fixtureCount: messages[0].args[8].getInteger(),
            layerChannels: messages[1].args
                .slice(2)
                .flatMap(arg => arg.getTargetNumberRange()),
        };
    }
}
