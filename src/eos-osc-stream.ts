import { Socket, createConnection } from 'node:net';
import { Duplex } from 'node:stream';
import * as osc from 'osc-min';
import * as slip from 'slip';

/**
 * Regular expression to match an OSC list-convention address ending with `/list/<list index>/<list count>`.
 */
const EOS_OSC_LIST_ADDRESS = /\/list\/(\d+)\/(\d+)$/;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EosOscArg = any;

export interface EosOscMessage {
    address: string;
    args: EosOscArg[];
}

/**
 * A SLIP-encoded OSC message stream.
 *
 * Messages split using the Eos OSC list convention will be held until all parts have been received. Once a complete
 * message is received, it will be emitted as a single message without the list convention address parts (without the
 * `/list/<list index>/<list count>` suffix).
 */
export class EosOscStream extends Duplex {
    private argumentListCache = new Map<string, EosOscArg[]>();

    private readingPaused = false;

    private slipDecoder = new slip.Decoder({
        onError: (_msgBuffer: Uint8Array, errMsg: string) =>
            console.error(`SLIP decoder error: ${errMsg}`),
        onMessage: this.onSlipFrameReceived.bind(this),
    });

    constructor(private socket: Socket) {
        super({ objectMode: true });

        this.wrapSocket();
    }

    static connect(host: string, port = 3037) {
        const socket = createConnection(port, host);

        return new EosOscStream(socket);
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

    _destroy(
        error: Error | null,
        callback: (error: Error | null) => void,
    ): void {
        this.socket.destroy(error ?? undefined);
        callback(null);
    }

    _write(
        chunk: osc.Packet,
        encoding: BufferEncoding,
        callback: (error?: Error | null) => void,
    ) {
        const data = osc.toBuffer(chunk);
        const buffer = slip.encode(data);

        this.socket.write(buffer, encoding, callback);
    }

    _read() {
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
            console.error('Malformed OSC packet:', err);
            return;
        }

        if (packet.oscType === 'bundle') {
            console.warn('Ignoring OSC bundle');
            return;
        }

        // Flatten the message arguments and omit unnecessary fields
        const msg: EosOscMessage = {
            address: (packet as osc.Message).address,
            args: (packet as osc.Message).args.map(arg => arg.value),
        };

        this.onMessageReceived(msg);
    }

    private onMessageReceived(msg: EosOscMessage) {
        const matches = EOS_OSC_LIST_ADDRESS.exec(msg.address);

        if (matches) {
            // Strip the `/list/<list index>/<list count>` suffix
            msg.address = msg.address.substring(0, matches.index);

            const argListCount = parseInt(matches[2]);

            // If a partial set of args has been received, cache them and wait for more messages
            if (msg.args.length < argListCount) {
                const argListIndex = parseInt(matches[1]);

                if (argListIndex === 0) {
                    // First message; create a cache entry with the partial argument list
                    this.argumentListCache.set(msg.address, msg.args);
                    return;
                }

                // Otherwise keep collecting args until we have received the expected amount
                const cachedArgs = this.argumentListCache.get(msg.address);

                if (!cachedArgs) {
                    console.error(
                        `no arg cache entry found for "${msg.address}"`,
                    );
                    return;
                }

                // Accumulate args
                cachedArgs.splice(argListIndex, msg.args.length, ...msg.args);

                if (cachedArgs.length < argListCount) {
                    // Don't release the message yet as we're expecting more args
                    return;
                }

                // At this point all args have been received, so release the message with its full argument set and
                // remove from the cache
                msg.args = cachedArgs;
                this.argumentListCache.delete(msg.address);
            }
        }

        // Add message to read buffer
        const hasSpace = this.push(msg);

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
