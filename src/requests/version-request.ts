import { OscMessage } from '../osc';
import { Request } from './request';

export class VersionRequest extends Request<string> {
    get outboundMessage(): OscMessage {
        return new OscMessage('/eos/get/version');
    }

    protected override unpack(messages: OscMessage[]): string {
        if (messages[0].address !== '/eos/out/get/version') {
            this.error = new Error(
                'unexpected response for Eos version request',
            );
        }

        return messages[0].args[0].getString();
    }
}
