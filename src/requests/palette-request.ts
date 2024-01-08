import { TargetNumber } from '../eos-types';
import { OscMessage } from '../osc';
import { Palette, PaletteType } from '../record-targets';
import {
    RecordTargetRequest,
    unpackBaseRecordTarget,
} from './record-target-request';

export class PaletteRequest extends RecordTargetRequest<Palette> {
    static index(index: number, paletteType: PaletteType) {
        return new PaletteRequest(`/eos/get/${paletteType}/index/${index}`, 3);
    }

    static get(targetNumber: TargetNumber, paletteType: PaletteType) {
        return new PaletteRequest(`/eos/get/${paletteType}/${targetNumber}`, 3);
    }

    protected override unpack(messages: OscMessage[]): Palette {
        return {
            targetType: messages[0].address.split('/')[4] as PaletteType,
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
        };
    }
}
