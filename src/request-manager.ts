import { EosOscMessage } from './eos-osc-stream';

export class RequestManager {
    private inflightRequests: InflightRequest[] = [];

    cancelAll(reason: Error) {
        this.inflightRequests.forEach(r => {
            r.completer.reject(reason);
        });
    }

    handleResponse(msg: EosOscMessage) {
        const currentRequest = this.currentRequest;

        if (!currentRequest) {
            throw new Error('unsolicited /eos/out/get response');
        }

        currentRequest.collectedResponses.push(msg);

        // All responses have been collected after either the expected number
        // has been received, or we're requesting a record target and single
        // response was received that doesn't contain a UID.
        const done =
            currentRequest.collectedResponses.length >=
                currentRequest.expectedResponseCount ||
            (currentRequest.isRecordTarget && msg.args[1] === undefined);

        if (done) {
            currentRequest.completer.resolve(currentRequest.collectedResponses);
            this.inflightRequests.shift();
        }
    }

    register(
        request: EosOscMessage,
        isRecordTarget = false,
        expectedResponseCount = 1,
    ) {
        const completer = new Deferred<EosOscMessage[]>();

        this.inflightRequests.push({
            address: request.address,
            collectedResponses: [],
            completer,
            expectedResponseCount,
            isRecordTarget,
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

interface InflightRequest {
    address: string;
    collectedResponses: EosOscMessage[];
    completer: Deferred<EosOscMessage[]>;
    expectedResponseCount: number;
    isRecordTarget: boolean;
}
