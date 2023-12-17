import { Socket, createConnection } from 'node:net';
import { Duplex } from 'node:stream';
import * as osc from 'osc-min';
import * as slip from 'slip';
import { LogHandler } from './log';
import { OscArgumentListJoiner } from './osc-argument-list-joiner';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EosOscArg = any;

export interface EosOscMessage {
    address: string;
    args: EosOscArg[];
}

/**
 * A SLIP-encoded OSC message stream.
 *
 * Messages split using the Eos OSC list convention will be held until all parts
 * have been received (@see {@link OscArgumentListJoiner}). Once a complete
 * message is received, it will be emitted as a single message without the list
 * convention address parts (without the `/list/<list index>/<list count>`
 * suffix).
 */
export class EosOscStream extends Duplex {
    private argumentListJoiner = new OscArgumentListJoiner();

    private readingPaused = false;

    private slipDecoder = new slip.Decoder({
        onError: (_msgBuffer: Uint8Array, errMsg: string) =>
            this.log?.('error', `SLIP decoder error: ${errMsg}`),
        onMessage: this.onSlipFrameReceived.bind(this),
    });

    constructor(
        private socket: Socket,
        private log?: LogHandler,
    ) {
        super({ objectMode: true });

        this.wrapSocket();
    }

    static connect(host: string, port = 3037, log?: LogHandler) {
        const socket = createConnection(port, host);

        return new EosOscStream(socket, log);
    }

    async writeOsc(msg: EosOscMessage) {
        return new Promise<void>((resolve, reject) => {
            this._write(msg, 'binary', err => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    override _destroy(
        error: Error | null,
        callback: (error: Error | null) => void,
    ): void {
        this.socket.destroy(error ?? undefined);
        callback(null);
    }

    override _write(
        chunk: osc.Packet,
        encoding: BufferEncoding,
        callback: (error?: Error | null) => void,
    ) {
        const data = osc.toBuffer(chunk);
        const buffer = slip.encode(data);

        this.log?.('debug', `Write: ${JSON.stringify(chunk)}`);

        this.socket.write(buffer, encoding, callback);
    }

    override _read() {
        this.readingPaused = false;
        setImmediate(this.onReadable.bind(this));
    }

    private onReadable() {
        let chunk: osc.Packet;

        while (null !== (chunk = this.socket.read()) && !this.readingPaused) {
            this.slipDecoder.decode(chunk);
        }
    }

    private onSlipFrameReceived(frame: Uint8Array) {
        let packet: osc.Packet;

        try {
            packet = osc.fromBuffer(frame);
        } catch (err) {
            this.log?.('error', `Malformed OSC packet: ${err}`);
            return;
        }

        this.log?.('debug', `Read: ${JSON.stringify(packet)}`);

        if (!isOscMessage(packet)) {
            this.log?.('warn', `Ignoring OSC ${packet.oscType}`);
            return;
        }

        this.onMessageReceived({
            address: packet.address,
            args: packet.args.map(arg => arg.value),
        });
    }

    private onMessageReceived(message: EosOscMessage) {
        const fullMessage = this.argumentListJoiner.process(message);

        if (fullMessage) {
            this.releaseMessage(fullMessage);
        }
    }

    private releaseMessage(message: EosOscMessage) {
        // Add message to read buffer
        const hasSpace = this.push(message);

        // Pause reading if consumer is slow
        if (!hasSpace) {
            this.readingPaused = true;
        }
    }

    private wrapSocket() {
        this.socket.on('close', hadError => this.emit('close', hadError));
        this.socket.on('connect', () => this.emit('connect'));
        this.socket.on('drain', () => this.emit('drain'));
        this.socket.on('end', () => this.emit('end'));
        this.socket.on('error', err => this.emit('error', err));
        this.socket.on('lookup', (err, address, family, host) =>
            this.emit('lookup', err, address, family, host),
        );
        this.socket.on('ready', () => this.emit('ready'));
        this.socket.on('timeout', () => this.emit('timeout'));

        this.socket.on('readable', this.onReadable.bind(this));
    }
}

const isOscMessage = (packet: osc.Packet): packet is osc.Message => {
    return packet.oscType === 'message';
};
