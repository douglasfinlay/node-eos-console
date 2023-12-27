import { OscArgument, OscMessage } from './osc';
import { createConnection, Socket } from 'node:net';
import osc from 'osc-min';
import slip from 'slip';
import { LogHandler } from './log';
import { OscArgumentListJoiner } from './osc-argument-list-joiner';

export type EosConnectionState =
    | 'disconnected'
    | 'disconnecting'
    | 'connected'
    | 'connecting';

/**
 * A SLIP-encoded OSC message stream.
 *
 * Messages split using the Eos OSC list convention will be held until all parts
 * have been received (@see {@link OscArgumentListJoiner}). Once a complete
 * message is received, it will be emitted as a single message without the list
 * convention address parts (without the `/list/<list index>/<list count>`
 * suffix).
 */
export class EosConnection {
    onDisconnect?: (err?: Error | undefined) => void;
    onMessage?: (message: OscMessage) => void;

    private argumentListJoiner = new OscArgumentListJoiner();
    private socket: Socket | null = null;
    private slipDecoder = new slip.Decoder({
        onError: (_msgBuffer: Uint8Array, errMsg: string) =>
            this.log?.('error', `SLIP decoder error: ${errMsg}`),
        onMessage: frame => {
            this.onSlipFrame(frame);
        },
    });

    constructor(
        public readonly host: string,
        public readonly port: number,
        private log?: LogHandler,
    ) {}

    private _state: EosConnectionState = 'disconnected';

    get state() {
        return this._state;
    }

    connect(): Promise<void> {
        if (this._state !== 'disconnected') {
            throw new Error('transport already in use');
        }

        this._state = 'connecting';

        return new Promise<void>((resolve, reject) => {
            const onReady = () => {
                this.socket?.off('error', onError);

                this.socket?.once('close', () => {
                    this._state = 'disconnected';
                    this.onDisconnect?.();

                    this.socket?.removeAllListeners();
                    this.socket = null;
                });

                this.socket?.on('data', data => {
                    this.slipDecoder.decode(data);
                });

                this._state = 'connected';
                resolve();
            };

            const onError = (err: Error) => {
                this.socket?.removeAllListeners();
                this.socket = null;

                this._state = 'disconnected';
                this.onDisconnect?.(err);

                reject(err);
            };

            this.socket = createConnection(this.port, this.host);
            this.socket.once('error', onError);
            this.socket.once('ready', onReady);
        });
    }

    disconnect(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (!this.socket) {
                reject('not connected');
                return;
            }

            this.socket.once('close', () => {
                resolve();
            });

            this._state = 'disconnecting';
            this.socket.destroy();
        });
    }

    isConnected(): boolean {
        return !!this.socket && this._state === 'connected';
    }

    send(message: OscMessage): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (!this.isConnected() || !this.socket) {
                throw new Error('transport is not connected');
            }

            const data = osc.toBuffer(message);
            const buffer = slip.encode(data);

            this.log?.('debug', `Write: ${message.toString()}`);

            this.socket.write(buffer, 'binary', err => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    private onSlipFrame(frame: Uint8Array) {
        let packet: osc.Packet;

        try {
            packet = osc.fromBuffer(frame);
        } catch (err) {
            let errMessage = 'Malformed OSC packet';

            if (err instanceof Error) {
                errMessage += `: ${err.message}`;
            }

            this.log?.('error', errMessage);
            return;
        }

        if (!isOscMessage(packet)) {
            this.log?.('warn', `Ignoring OSC ${packet.oscType}`);
            return;
        }

        this.onMessageReceived(
            new OscMessage(
                packet.address,
                packet.args.map(arg => new OscArgument(arg.value, arg.type)),
            ),
        );
    }

    private onMessageReceived(message: OscMessage) {
        this.log?.('debug', `Read: ${message.toString()}`);

        const fullMessage = this.argumentListJoiner.process(message);

        if (fullMessage) {
            this.onMessage?.(fullMessage);
        }
    }
}

const isOscMessage = (packet: osc.Packet): packet is osc.Message => {
    return packet.oscType === 'message';
};
