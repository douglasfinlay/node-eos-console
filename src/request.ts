import { EosOscMessage } from './eos-osc-stream';
import { RecordTargetType } from './record-targets';

export type EosResponseType<T extends EosRequest> = T extends EosRequest<
    infer R
>
    ? R
    : never;

/**
 * Prepares an `/eos/get/...` OSC request then collects, validates, and parses
 * one or more responses.
 */
export abstract class EosRequest<T = unknown> {
    protected static readonly REQUEST_PREFIX = '/eos/get';
    protected static readonly RESPONSE_PREFIX = '/eos/out/get';

    private _error?: Error;
    private _response?: T;

    abstract get outboundMessage(): EosOscMessage;

    protected set response(response: T) {
        this._response = response;
    }

    get response(): T | undefined {
        return this._response;
    }

    protected set error(err: Error) {
        this._error = err;
    }

    get error(): Error | undefined {
        return this._error;
    }

    get isComplete(): boolean {
        return this.response !== undefined;
    }

    abstract collectResponse(msg: EosOscMessage): void;
}

export class EosVersionRequest extends EosRequest<string> {
    get outboundMessage(): EosOscMessage {
        return {
            address: '/eos/get/version',
            args: [],
        };
    }

    collectResponse(msg: EosOscMessage): void {
        if (msg.address !== '/eos/out/get/version') {
            this.error = new Error(
                'unexpected response for Eos version request',
            );
        }

        this.response = msg.args[0];
    }
}

export class EosRecordTargetCountRequest extends EosRequest<number> {
    private outboundAddress: string;
    private responseAddress: string;

    constructor(targetType: 'cue', cueList: number);
    constructor(targetType: Exclude<RecordTargetType, 'cue'>);
    constructor(targetType: RecordTargetType, cueList?: number) {
        super();

        if (targetType === 'cue') {
            if (!cueList) {
                throw new TypeError(`cueList is required`);
            }

            this.outboundAddress = `${EosRequest.REQUEST_PREFIX}/cue/${cueList}/noparts/count`;
            this.responseAddress = `${EosRequest.RESPONSE_PREFIX}/cue/${cueList}/noparts/count`;
        } else {
            this.outboundAddress = `${EosRequest.REQUEST_PREFIX}/${targetType}/count`;
            this.responseAddress = `${EosRequest.RESPONSE_PREFIX}/${targetType}/count`;
        }
    }

    get outboundMessage(): EosOscMessage {
        return {
            address: this.outboundAddress,
            args: [],
        };
    }

    collectResponse(msg: EosOscMessage): void {
        if (msg.address !== this.responseAddress) {
            this.error = new Error(
                `unexpected response for record target count request: ${this.responseAddress}`,
            );
        }

        this.response = msg.args[0];
    }
}
