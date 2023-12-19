declare module 'slip' {
    interface SlipEncoderOptions {
        bufferPadding?: number;
        byteLength?: number;
        offset?: number;
    }

    function encode(
        data: ArrayLike<number> | ArrayBufferLike,
        options?: SlipEncoderOptions,
    ): Uint8Array;

    interface SlipDecoderOptions {
        bufferSize?: number;
        maxMessageSize?: number;
        onError?: (msgBuffer: Uint8Array, errorMsg: string) => void;
        onMessage?: (msg: Uint8Array) => void;
    }

    class Decoder {
        constructor(options: SlipDecoderOptions);

        decode(
            data: ArrayLike<number> | ArrayBufferLike,
        ): Uint8Array | undefined;
    }
}
