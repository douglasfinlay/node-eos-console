declare module 'osc-min' {
    type Packet = Message | Bundle;

    type Message = {
        address: string;
        args: Argument[];
        oscType?: 'message';
    };

    type Argument = {
        type?: ArgumentType;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        value: any;
    };

    type ArgumentType =
        | 'array'
        | 'bang'
        | 'blob'
        | 'double'
        | 'false'
        | 'float'
        | 'integer'
        | 'null'
        | 'string'
        | 'timetag'
        | 'true';

    type Bundle = {
        elements: Packet[];
        oscType?: 'bundle';
        timeTag: Timetag;
    };

    type Timetag = null | number | NtpTimetag | Date;

    type NtpTimetag = [number, number];

    function fromBuffer(
        buffer: ArrayBuffer | Uint8Array,
        strict?: boolean,
    ): Packet;

    function toBuffer(packet: Packet, strict?: boolean): Buffer;

    function toBuffer(
        address: string,
        args: Argument | Argument[],
        strict?: boolean,
    ): Buffer;

    type AddressTransformationCallback = (address: string) => string;

    function applyAddressTransformation(
        buffer: Buffer,
        transform: AddressTransformationCallback,
    ): Buffer;

    type MessageTransformationCallback = (message: Message) => Message;

    function applyMessageTransformation(
        buffer: Buffer,
        transform: MessageTransformationCallback,
    ): Buffer;

    function timetagToDate(ntpTimeTag: NtpTimetag): Date;

    function dateToTimetag(date: Date): NtpTimetag;

    function timetagToTimestamp(timeTag: NtpTimetag): number;

    function timestampToTimetag(timestamp: number): NtpTimetag;
}
