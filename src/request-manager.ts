import { EosOscMessage } from './eos-osc-stream';
import { EosRequest, EosResponseType } from './request';

export class RequestManager {
    // FIXME:
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private inflightRequests: InflightRequest<any>[] = [];

    cancelAll(reason: Error) {
        this.inflightRequests.forEach(r => {
            r.completer.reject(reason);
        });
    }

    handleResponse(msg: EosOscMessage) {
        const currentRequest = this.currentRequest;
        if (!currentRequest) {
            throw new Error(`unsolicited response "${msg.address}"`);
        }

        currentRequest.handler.collectResponse(msg);

        if (currentRequest.handler.error) {
            currentRequest.completer.reject(currentRequest.handler.error);
        } else if (currentRequest.handler.isComplete) {
            this.inflightRequests.shift();
            currentRequest.completer.resolve(currentRequest.handler.response);
        }
    }

    register<T extends EosResponseType<EosRequest>>(
        request: EosRequest<T>,
    ): Promise<T> {
        const completer = new Deferred<T>();

        this.inflightRequests.push({
            completer,
            handler: request,
        });

        return completer.promise;
    }

    private get currentRequest(): InflightRequest<unknown> | undefined {
        return this.inflightRequests[0];
    }
}

class Deferred<T = unknown> {
    resolve!: (value: T) => void;
    reject!: (reason?: Error) => void;

    promise = new Promise<T>((resolve, reject) => {
        this.resolve = resolve;
        this.reject = reject;
    });
}

interface InflightRequest<T extends EosResponseType<EosRequest>> {
    completer: Deferred<T>;
    handler: EosRequest<T>;
}
