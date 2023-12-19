import { OscMessage } from './osc';
import { EosRequest } from './request';

export class RequestManager {
    private inflightRequests: InflightRequest[] = [];

    cancelAll(reason: Error) {
        this.inflightRequests.forEach(r => {
            r.completer.reject(reason);
        });
    }

    handleResponse(msg: OscMessage) {
        const currentRequest = this.currentRequest;

        if (!currentRequest) {
            throw new Error(`unsolicited response "${msg.address}"`);
        }

        currentRequest.handler.collectResponse(msg);

        if (currentRequest.handler.error) {
            currentRequest.completer.reject(currentRequest.handler.error);
        } else if (currentRequest.handler.isComplete) {
            this.inflightRequests.shift();

            // Explicitly check for undefined as null is a valid response
            if (currentRequest.handler.response === undefined) {
                throw new Error('undefined response in request handler');
            }

            currentRequest.completer.resolve(currentRequest.handler.response);
        }
    }

    register<T>(request: EosRequest<T>): Promise<T> {
        const completer = new Deferred<T>();

        this.inflightRequests.push({
            completer: completer as Deferred<unknown>,
            handler: request,
        });

        return completer.promise;
    }

    private get currentRequest(): InflightRequest | undefined {
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

interface InflightRequest<T = unknown> {
    completer: Deferred<T>;
    handler: EosRequest<T>;
}
