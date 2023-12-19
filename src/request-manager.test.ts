import chai, { assert } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { OscMessage } from './osc';
import { EosRequest } from './request';
import { RequestManager } from './request-manager';

chai.use(chaiAsPromised);

class TestRequest extends EosRequest<number> {
    constructor(private id: number) {
        super();
    }

    override get outboundMessage(): OscMessage {
        return new OscMessage(`/eos/get/${this.id}`);
    }

    protected override unpack(messages: OscMessage[]): number {
        if (messages[0].address !== `/eos/out/get/${this.id}`) {
            this.error = new Error('unexpected response');
        }

        return this.id;
    }
}

describe('Request manager', () => {
    let requestManager: RequestManager;

    beforeEach(() => {
        requestManager = new RequestManager();
    });

    describe('cancelAll', () => {
        it('Should cancel all in-flight requests with a reason', () => {
            const requests = buildTestRequests(10);
            const handles = requests.map(request =>
                requestManager.register(request),
            );
            const reason = new Error('cancelled for test case');

            requestManager.cancelAll(reason);

            return Promise.all(
                handles.map(handle =>
                    assert.isRejected(handle, Error, 'cancelled for test case'),
                ),
            );
        });
    });

    describe('handleResponse', () => {
        it('Should propagate response payload upon request success', () => {
            const request = new TestRequest(123);
            const handle = requestManager.register(request);

            requestManager.handleResponse(new OscMessage('/eos/out/get/123'));

            return assert.becomes(handle, 123);
        });

        it('Should propagate error upon request failure', () => {
            const request = new TestRequest(123);
            const handle = requestManager.register(request);

            requestManager.handleResponse(new OscMessage('/eos/out/get/1'));

            return assert.isRejected(handle);
        });

        it('Should throw an error if there is no in-flight request', () => {
            const response = new OscMessage('/eos/out/get');

            assert.throws(() => {
                requestManager.handleResponse(response);
            });
        });
    });
});

function buildTestRequests(count: number) {
    const requests: TestRequest[] = [];

    for (let i = 0; i < count; i++) {
        requests.push(new TestRequest(i));
    }

    return requests;
}
