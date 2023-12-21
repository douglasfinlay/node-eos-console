import { assert } from 'chai';
import { OscMessage } from './osc';
import { OscArgumentListJoiner } from './osc-argument-list-joiner';

describe('OSC argument list joiner', () => {
    describe('process', () => {
        let joiner: OscArgumentListJoiner;

        beforeEach(() => {
            joiner = new OscArgumentListJoiner();
        });

        it('Should pass through messages that do not use the argument list convention', () => {
            const message = new OscMessage('/demo/message', [
                'a',
                'b',
                'c',
                1,
                2,
                3,
            ]);

            const result = joiner.process(message);
            assert.deepStrictEqual(result, message);
        });

        it('Should hold messages until all arguments have been collected', () => {
            let result = joiner.process(
                new OscMessage('/demo/message/list/0/6', ['a', 'b']),
            );
            assert.isNull(result);

            result = joiner.process(
                new OscMessage('/demo/message/list/2/6', ['c', 1]),
            );
            assert.isNull(result);

            result = joiner.process(
                new OscMessage('/demo/message/list/4/6', [2, 3]),
            );
            assert.deepStrictEqual(
                result,
                new OscMessage('/demo/message', ['a', 'b', 'c', 1, 2, 3]),
            );
        });

        it('Should throw an error if an out-of-sequence argument list is received', () => {
            assert.throws(() => {
                joiner.process(
                    new OscMessage('/demo/message/list/2/6', ['a', 'b']),
                );
            });

            joiner.process(
                new OscMessage('/demo/message/list/0/6', ['a', 'b']),
            );

            assert.throws(() => {
                joiner.process(
                    new OscMessage('/demo/message/list/4/6', [2, 3]),
                );
            });
        });

        it('Should throw an error if an out-of-sequence message is received', () => {
            joiner.process(
                new OscMessage('/demo/message/list/0/6', ['a', 'b']),
            );

            assert.throws(() => {
                joiner.process(
                    new OscMessage('/demo/unexpected/message', ['a', 'b']),
                );
            });
        });

        it('Should strip the list convention suffix from single messages', () => {
            const message = joiner.process(
                new OscMessage('/demo/message/list/0/2', ['a', 'b']),
            );
            assert.equal(message?.address, '/demo/message');
        });

        it('Should strip the list convention suffix from split messages', () => {
            joiner.process(
                new OscMessage('/demo/message/list/0/6', ['a', 'b', 'c']),
            );
            const message = joiner.process(
                new OscMessage('/demo/message/list/3/6', ['d', 'e', 'f']),
            );
            assert.equal(message?.address, '/demo/message');
        });
    });
});
