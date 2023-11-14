import { EosOscMessage } from './eos-osc-stream';
import {
    OSC_RECORD_TARGET_RESPONSE_COUNT,
    OSC_RECORD_TARGET_UNPACK_FN,
} from './osc-record-target-parser';
import {
    Cue,
    RecordTarget,
    RecordTargetType,
    RecordTargets,
} from './record-targets';

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

    private oscResponses: EosOscMessage[] = [];

    abstract get outboundMessage(): EosOscMessage;

    constructor(private expectedResponseCount = 1) {}

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

    collectResponse(msg: EosOscMessage) {
        if (!msg.address.startsWith(EosRequest.RESPONSE_PREFIX)) {
            throw new Error(
                `unexpected response (missing ${EosRequest.RESPONSE_PREFIX}) address prefix)`,
            );
        }

        this.oscResponses.push(msg);

        if (this.oscResponses.length === this.expectedResponseCount) {
            this.response = this.unpack(this.oscResponses);
        }
    }

    protected abstract unpack(messages: EosOscMessage[]): T;
}

export class EosVersionRequest extends EosRequest<string> {
    get outboundMessage(): EosOscMessage {
        return {
            address: '/eos/get/version',
            args: [],
        };
    }

    protected override unpack(messages: EosOscMessage[]): string {
        if (messages[0].address !== '/eos/out/get/version') {
            this.error = new Error(
                'unexpected response for Eos version request',
            );
        }

        return messages[0].args[0];
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
                throw new TypeError(`cueList argument is required`);
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

    protected override unpack(messages: EosOscMessage[]): number {
        if (messages[0].address !== this.responseAddress) {
            this.error = new Error(
                `unexpected response for record target count request: ${this.responseAddress}`,
            );
        }

        return messages[0].args[0];
    }
}

export class EosRecordTargetRequest<
    T extends RecordTarget,
> extends EosRequest<T | null> {
    static index(
        targetType: 'cue',
        index: number,
        cueList: number,
    ): EosRecordTargetRequest<Cue>;
    static index<TTargetType extends Exclude<RecordTargetType, 'cue'>>(
        targetType: TTargetType,
        index: number,
    ): EosRecordTargetRequest<RecordTargets[TTargetType]>;
    static index<TTargetType extends RecordTargetType>(
        targetType: TTargetType,
        index: number,
        cueList?: number,
    ): EosRecordTargetRequest<RecordTargets[TTargetType]> {
        let outboundAddress = '';

        if (targetType === 'cue') {
            if (!cueList) {
                throw new TypeError(`cueList argument is required`);
            }

            outboundAddress = `${EosRequest.REQUEST_PREFIX}/cue/${cueList}/noparts/index/${index}`;
        } else {
            outboundAddress = `${EosRequest.REQUEST_PREFIX}/${targetType}/index/${index}`;
        }

        return new EosRecordTargetRequest<RecordTargets[TTargetType]>(
            outboundAddress,
            OSC_RECORD_TARGET_RESPONSE_COUNT[targetType],
            OSC_RECORD_TARGET_UNPACK_FN[targetType],
        );
    }

    static get(
        targetType: 'cue',
        targetNumber: number,
        cueList: number,
    ): EosRecordTargetRequest<Cue>;
    static get<TTargetType extends Exclude<RecordTargetType, 'cue'>>(
        targetType: TTargetType,
        targetNumber: number,
    ): EosRecordTargetRequest<RecordTargets[TTargetType]>;
    static get<TTargetType extends RecordTargetType>(
        targetType: TTargetType,
        targetNumber: number,
        cueList?: number,
    ): EosRecordTargetRequest<RecordTargets[TTargetType]> {
        let outboundAddress = '';

        if (targetType === 'cue') {
            if (!cueList) {
                throw new TypeError(`cueList argument is required`);
            }

            outboundAddress = `${EosRequest.REQUEST_PREFIX}/cue/${cueList}/${targetNumber}/0`;
        } else {
            outboundAddress = `${EosRequest.REQUEST_PREFIX}/${targetType}/${targetNumber}`;
        }

        const unpackFn = OSC_RECORD_TARGET_UNPACK_FN[targetType];

        return new EosRecordTargetRequest<RecordTargets[TTargetType]>(
            outboundAddress,
            OSC_RECORD_TARGET_RESPONSE_COUNT[targetType],
            unpackFn,
        );
    }

    private constructor(
        private outboundAddress: string,
        expectedResponseCount: number,
        private unpackFn: (messages: EosOscMessage[]) => T,
    ) {
        super(expectedResponseCount);
    }

    get outboundMessage(): EosOscMessage {
        return {
            address: this.outboundAddress,
            args: [],
        };
    }

    override collectResponse(msg: EosOscMessage) {
        if (msg.args[1] === undefined) {
            // UID is missing, so record target does not exist
            this.response = null;
            return;
        }

        super.collectResponse(msg);
    }

    protected override unpack(messages: EosOscMessage[]): T {
        return this.unpackFn(messages);
    }
}
