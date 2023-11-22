import { assert } from 'chai';
import { TargetNumber, expandTargetNumberArguments } from './target-number';

describe('Target number', () => {
    describe('expandOscTargetNumberArgs', () => {
        it('Should expand hyphenated target number ranges', () => {
            const args = ['1-3', '6-8'];
            const expected: TargetNumber[] = [1, 2, 3, 6, 7, 8];

            const result = expandTargetNumberArguments(args);

            assert.deepEqual(result, expected);
        });

        it('Should dedupe target numbers', () => {
            const args = ['1-3', 2, 3.14, 4, '5-7', '6-7'];
            const expected: TargetNumber[] = [1, 2, 3, 3.14, 4, 5, 6, 7];

            const result = expandTargetNumberArguments(args);

            assert.deepEqual(result, expected);
        });
    });
});
