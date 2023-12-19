import * as osc from 'osc-min';
import { TargetNumber } from './target-number';

export class OscMessage {
    public args: OscArgument[];

    constructor(
        public address: string,
        args: unknown[] = [],
    ) {
        this.args = args.map(arg =>
            arg instanceof OscArgument ? arg : new OscArgument(arg),
        );
    }

    /**
     * @returns a representation of the message following the format used in the
     * Eos diagnostics output; for example,
     * `/eos/out/get/version, 3.2.5.13(s), 3.2.4.115(s), 0(i)`
     */
    toString() {
        return this.args.reduce(
            (result, arg) => `${result}, ${arg}`,
            this.address,
        );
    }
}

export type OscType = osc.ArgumentType;

export class OscArgument<T = unknown> {
    constructor(
        public value: T,
        public type?: OscType,
    ) {}

    getBoolean(): boolean {
        if (typeof this.value !== 'boolean') {
            throw new Error(
                `argument is not a boolean: ${JSON.stringify(this.value)}`,
            );
        }

        return this.value;
    }

    getInteger(): number {
        if (typeof this.value !== 'number') {
            throw new Error(
                `argument is not an integer: ${JSON.stringify(this.value)}`,
            );
        }

        return this.value;
    }

    getFloat(): number {
        if (typeof this.value !== 'number') {
            throw new Error(
                `argument is not a float: ${JSON.stringify(this.value)}`,
            );
        }

        return this.value;
    }

    /**
     * @returns the value if non-negative, otherwise `null`
     */
    getOptionalInteger(): number | null {
        const value = this.getInteger();

        return value >= 0 ? value : null;
    }

    getString(): string {
        if (typeof this.value !== 'string') {
            throw new Error(
                `argument is not a string: ${JSON.stringify(this.value)}`,
            );
        }

        return this.value;
    }

    getTargetNumber(): TargetNumber {
        switch (typeof this.value) {
            case 'number':
                return this.value;
            case 'string':
                return Number(this.value);
            default:
                throw new Error(
                    `argument is not a valid target number: ${JSON.stringify(
                        this.value,
                    )}`,
                );
        }
    }

    toString() {
        let typeTag = '?';

        if (this.type) {
            typeTag = OSC_TYPE_TAGS[this.type] ?? typeTag;
        }

        return `${this.value}(${typeTag})`;
    }
}

type OscTypeTag =
    | 'i'
    | 'f'
    | 's'
    | 'b'
    | 'h'
    | 't'
    | 'd'
    | 'S'
    | 'c'
    | 'r'
    | 'm'
    | 'T'
    | 'F'
    | 'N'
    | 'I'
    | '['
    | ']';

const OSC_TYPE_TAGS: Record<OscType, OscTypeTag> = {
    array: '[',
    bang: 'I',
    blob: 'b',
    double: 'd',
    false: 'F',
    float: 'f',
    integer: 'i',
    null: 'N',
    string: 's',
    timetag: 't',
    true: 'T',
};
