import { TargetNumber } from '.';

export interface OscMessage {
    address: string;
    args: OscArgument[];
}

export interface OscType {
    string: string;
    float: number;
    integer: number;
}

export class OscArgument<T = unknown> {
    constructor(
        public value: T,
        public oscType?: OscType,
    ) {}

    getBoolean(): boolean {
        if (typeof this.value !== 'boolean') {
            throw new Error('argument is not a boolean');
        }

        return this.value;
    }

    getInteger(): number {
        if (typeof this.value !== 'number') {
            throw new Error('argument is not an integer');
        }

        return this.value;
    }

    getFloat(): number {
        if (typeof this.value !== 'number') {
            throw new Error('argument is not a float');
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
            throw new Error('argument is not a string');
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
                throw new Error('argument is not a valid target number');
        }
    }
}
