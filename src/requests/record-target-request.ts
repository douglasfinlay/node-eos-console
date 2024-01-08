import { OscMessage } from '../osc';
import { RecordTarget } from '../record-targets';
import { Request } from './request';

export abstract class RecordTargetRequest<
    T extends RecordTarget,
> extends Request<T | null> {
    protected constructor(
        private outboundAddress: string,
        expectedResponseCount?: number,
    ) {
        super(expectedResponseCount);
    }

    get outboundMessage(): OscMessage {
        return new OscMessage(this.outboundAddress);
    }

    override collectResponse(msg: OscMessage) {
        if (!msg.args[1]) {
            // UID is missing, so record target does not exist
            this.response = null;
            return;
        }

        super.collectResponse(msg);
    }
}

export function unpackBaseRecordTarget(
    message: OscMessage,
): Omit<RecordTarget, 'targetType' | 'targetNumber'> {
    return {
        uid: message.args[1].getString(),
        label: message.args[2].getString(),
    };
}
