import { OscMessage } from '../osc';

/**
 * Prepares an `/eos/get/...` OSC request then collects, validates, and parses
 * one or more responses.
 */
export abstract class Request<T> {
    protected static readonly REQUEST_PREFIX = '/eos/get';
    protected static readonly RESPONSE_PREFIX = '/eos/out/get';

    private _error?: Error;
    private _response?: T;

    private oscResponses: OscMessage[] = [];

    abstract get outboundMessage(): OscMessage;

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

    collectResponse(msg: OscMessage) {
        if (!msg.address.startsWith(Request.RESPONSE_PREFIX)) {
            throw new Error(
                `unexpected response (missing ${Request.RESPONSE_PREFIX}) address prefix)`,
            );
        }

        this.oscResponses.push(msg);

        if (this.oscResponses.length === this.expectedResponseCount) {
            this.response = this.unpack(this.oscResponses);
        }
    }

    protected abstract unpack(messages: OscMessage[]): T;
}
