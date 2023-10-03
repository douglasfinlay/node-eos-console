import { EosOscArg } from './eos-osc-stream';

/**
 * Parses and expands a target number range into individual target numbers. Target numbers that are not whole will be
 * kept as strings. For example:
 *   - "1.23" => "1.23"
 *   - "3-5" => [3, 4, 5]
 */
export function expandTargetNumberArguments(args: EosOscArg[]): string[] {
    const expandedArgs = args.flatMap(arg => {
        switch (typeof arg) {
            case 'number':
                return String(arg);
            case 'string':
                return parseStringTargetNumberRange(arg);
            default:
                console.error(
                    `unexpected target number argument type: ${typeof arg}`,
                );
                return [];
        }
    });

    // Remove duplicate target numbers
    return Array.from(new Set(expandedArgs));
}

export function parseStringTargetNumberRange(arg: string): string[] {
    const parts = arg.split('-');

    if (parts.length === 1) {
        return [parts[0]];
    } else if (parts.length === 2) {
        const lower = Number(parts[0]);
        const upper = Number(parts[1]);

        const targetNumbers: string[] = [];

        for (let i = lower; i <= upper; i++) {
            targetNumbers.push(String(i));
        }

        return targetNumbers;
    } else {
        console.error(`malformed target number argument: ${arg}`);
        return [];
    }
}
