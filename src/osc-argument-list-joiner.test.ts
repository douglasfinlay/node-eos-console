import { assert } from 'chai';
import { EosOscMessage } from './eos-osc-stream';
import { OscArgumentListJoiner } from './osc-argument-list-joiner';

describe('OSC argument list joiner', () => {
    describe('process', () => {
        let joiner: OscArgumentListJoiner;

        beforeEach(() => {
            joiner = new OscArgumentListJoiner();
        });

        it('Should pass through messages that do not use the argument list convention', () => {
            const message: EosOscMessage = {
                address: '/demo/message',
                args: ['a', 'b', 'c', 1, 2, 3],
            };

            const result = joiner.process(message);
            assert.deepStrictEqual(result, message);
        });

        it('Should hold messages until all arguments have been collected', () => {
            let result = joiner.process({
                address: '/demo/message/list/0/6',
                args: ['a', 'b'],
            });
            assert.isNull(result);

            result = joiner.process({
                address: '/demo/message/list/2/6',
                args: ['c', 1],
            });
            assert.isNull(result);

            result = joiner.process({
                address: '/demo/message/list/4/6',
                args: [2, 3],
            });
            assert.deepStrictEqual(result, {
                address: '/demo/message',
                args: ['a', 'b', 'c', 1, 2, 3],
            });
        });

        it('Should throw an error if an out-of-sequence argument list is received', () => {
            assert.throws(() => {
                joiner.process({
                    address: '/demo/message/list/2/6',
                    args: ['a', 'b'],
                });
            });

            joiner.process({
                address: '/demo/message/list/0/6',
                args: ['a', 'b'],
            });

            assert.throws(() => {
                joiner.process({
                    address: '/demo/message/list/4/6',
                    args: [2, 3],
                });
            });
        });

        it('Should throw an error if an out-of-sequence message is received', () => {
            joiner.process({
                address: '/demo/message/list/0/6',
                args: ['a', 'b'],
            });

            assert.throws(() => {
                joiner.process({
                    address: '/demo/unexpected/message',
                    args: ['a', 'b'],
                });
            });
        });
    });
});
