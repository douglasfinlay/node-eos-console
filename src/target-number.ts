import { EosOscArg } from './eos-osc-stream';

export type TargetNumber = number;

/**
 * Parses and expands a target number range into individual target numbers. Target numbers that are not whole will be
 * kept as strings. For example:
 *   - "1.23" => "1.23"
 *   - "3-5" => [3, 4, 5]
 */
export function expandTargetNumberArguments(args: EosOscArg[]): TargetNumber[] {
    const expandedArgs = args.flatMap(arg => {
        switch (typeof arg) {
            case 'number':
                return arg;
            case 'string':
                return parseStringTargetNumberRange(arg);
            default:
                throw new Error(
                    `unexpected type "${typeof arg}" for target number argument: ${arg}`,
                );
        }
    });

    // Remove duplicate target numbers
    return Array.from(new Set(expandedArgs));
}

export function parseStringTargetNumberRange(arg: string): TargetNumber[] {
    const parts = arg.split('-');

    if (parts.length === 1) {
        return [Number(parts[0])];
    } else if (parts.length === 2) {
        const lower = Number(parts[0]);
        const upper = Number(parts[1]);
        const targetNumbers: TargetNumber[] = [];

        for (let i = lower; i <= upper; i++) {
            targetNumbers.push(i);
        }

        return targetNumbers;
    } else {
        throw new Error(`malformed target number argument: ${arg}`);
    }
}
