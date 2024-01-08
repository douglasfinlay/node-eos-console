import { OscMessage } from '../osc';
import { RecordTargetType } from '../record-targets';
import { Request } from './request';

export class RecordTargetCountRequest extends Request<number> {
    private outboundAddress: string;
    private responseAddress: string;

    constructor(targetType: 'cue', cueList: number);
    constructor(targetType: Exclude<RecordTargetType, 'cue'>);
    constructor(targetType: RecordTargetType, cueList?: number) {
        super();

        if (targetType === 'cue') {
            if (!cueList) {
                throw new TypeError(`cueList argument is required`);
            }

            this.outboundAddress = `${Request.REQUEST_PREFIX}/cue/${cueList}/noparts/count`;
            this.responseAddress = `${Request.RESPONSE_PREFIX}/cue/${cueList}/noparts/count`;
        } else {
            this.outboundAddress = `${Request.REQUEST_PREFIX}/${targetType}/count`;
            this.responseAddress = `${Request.RESPONSE_PREFIX}/${targetType}/count`;
        }
    }

    get outboundMessage(): OscMessage {
        return new OscMessage(this.outboundAddress);
    }

    protected override unpack(messages: OscMessage[]): number {
        if (messages[0].address !== this.responseAddress) {
            this.error = new Error(
                `unexpected response for record target count request: ${this.responseAddress}`,
            );
        }

        return messages[0].args[0].getInteger();
    }
}
