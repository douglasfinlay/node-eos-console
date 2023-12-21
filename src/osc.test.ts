import { assert } from 'chai';
import { OscArgument } from './osc';

describe('OSC Argument', () => {
    describe('getTargetNumber', () => {
        it('Should handle integer target numbers', () => {
            assert.equal(new OscArgument(123).getTargetNumber(), 123);
        });

        it('Should convert string target numbers to numeric type', () => {
            assert.equal(new OscArgument('1.23').getTargetNumber(), 1.23);
        });
    });

    describe('getTargetNumberRange', () => {
        it('Should pass through single target numbers', () => {
            assert.deepEqual(new OscArgument(123).getTargetNumberRange(), [
                123,
            ]);
            assert.deepEqual(new OscArgument('1.23').getTargetNumberRange(), [
                1.23,
            ]);
        });

        it('Should expand hyphenated target number ranges', () => {
            assert.deepEqual(
                new OscArgument('1-5').getTargetNumberRange(),
                [1, 2, 3, 4, 5],
            );
        });
    });
});
