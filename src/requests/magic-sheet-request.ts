import { TargetNumber } from '../eos-types';
import { OscMessage } from '../osc';
import { MagicSheet } from '../record-targets';
import {
    RecordTargetRequest,
    unpackBaseRecordTarget,
} from './record-target-request';

export class MagicSheetRequest extends RecordTargetRequest<MagicSheet> {
    static index(index: number) {
        return new MagicSheetRequest(`/eos/get/ms/index/${index}`);
    }

    static get(targetNumber: TargetNumber) {
        return new MagicSheetRequest(`/eos/get/ms/${targetNumber}`);
    }

    protected override unpack(messages: OscMessage[]): MagicSheet {
        return {
            targetType: 'ms',
            targetNumber: Number(messages[0].address.split('/')[5]),
            ...unpackBaseRecordTarget(messages[0]),
        };
    }
}
