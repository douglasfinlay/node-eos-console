import { EventEmitter } from 'node:events';
import { inspect } from 'node:util';
import { parseImplicitOutput } from './eos-implicit-output';
import { EosOscMessage, EosOscStream } from './eos-osc-stream';
import { Cue } from './record-targets';

export type EosConnectionState = 'disconnected' | 'connecting' | 'connected';

type RecordTargetUid = string;

class Deferred<T = unknown> {
    resolve!: (value: T) => void;
    reject!: (reason?: Error) => void;

    promise = new Promise<T>((resolve, reject) => {
        this.resolve = resolve;
        this.reject = reject;
    });
}

export class EosConsole extends EventEmitter {
    private socket: EosOscStream | null = null;
    private connectionState: EosConnectionState = 'disconnected';

    private inflightRequests: Deferred<EosOscMessage>[] = [];

    private eosVersion: string | null = null;
    private showName: string | null = null;

    private cuesByRecordTargetUid = new Map<RecordTargetUid, Cue>();
    private recordTargetUidByCueNumber = new Map<string, RecordTargetUid>();

    constructor(
        public readonly host: string,
        public readonly port = 3037,
    ) {
        super();
    }

    async connect(timeout = 5000) {
        console.log(`Connecting to EOS console at ${this.host}:${this.port}`);

        this.connectionState = 'connecting';
        this.emit('connecting');

        const timer = setTimeout(() => {
            handleConnectTimeout();
        }, timeout);

        const handleConnectError = (err: Error) => {
            clearTimeout(timer);
            this.socket?.off('ready', handleReady);

            this.emit('connectError', err);
        };

        const handleConnectTimeout = () => {
            this.socket?.destroy();
            this.socket?.off('error', handleConnectError);
            this.socket?.off('ready', handleReady);

            this.emit('connectError', new Error('timed out'));
        };

        const handleReady = async () => {
            clearTimeout(timer);

            this.socket?.off('error', handleConnectError);

            this.socket?.once('close', () => {
                console.log('EOS connection closed');

                this.connectionState = 'disconnected';
                this.emit('disconnect');

                this.socket?.removeAllListeners();
            });

            this.socket?.on('error', this.handleOscError.bind(this));
            this.socket?.on('data', this.handleOscMessage.bind(this));

            console.log('Connected');

            this.connectionState = 'connected';
            this.emit('connect');

            const version = await this.getVersion();
            console.log(`Eos version ${version}`);
        };

        this.socket = EosOscStream.connect(this.host, this.port);
        this.socket.once('error', handleConnectError);
        this.socket.once('ready', handleReady);
    }

    disconnect() {
        console.log('Disconnecting from EOS console');

        this.socket?.destroy();

        for (const deferred of this.inflightRequests) {
            deferred.reject(new Error('connection closed'));
        }
    }

    async getVersion() {
        const response = await this.request({
            address: '/eos/get/version',
            args: [],
        });

        return response.args[0] as string;
    }

    async getCueCount(cueList: number) {
        const response = await this.request({
            address: `/eos/get/cue/${cueList}/count`,
            args: [],
        });

        return response.args[0] as number;
    }

    async getCue(cueList: number, index: number) {
        const responses = await this.requestMultiple(
            {
                address: `/eos/get/cue/${cueList}/index/${index}`,
                args: [],
            },
            4,
        );

        console.log(responses);
    }

    async changeUser(userId: number) {
        await this.socket?.writeOsc({
            address: '/eos/user',
            args: [userId],
        });
    }

    executeCommand(
        command: string,
        substitutions: string[],
        newCommand = true,
    ) {
        const msg: EosOscMessage = {
            address: newCommand ? '/eos/newcmd' : '/eos/cmd',
            args: [command, ...substitutions],
        };

        this.socket?.writeOsc(msg);
    }

    fireCue(cueListNumber: number, cueNumber: string) {
        const msg: EosOscMessage = {
            address: `/eos/cue/${cueListNumber}/${cueNumber}/fire`,
            args: [],
        };

        this.socket?.writeOsc(msg);
    }

    // getCues(): Cue[] {
    //     return Array.from(this.cuesByRecordTargetUid.values());
    // }

    get consoleConnectionState(): EosConnectionState {
        return this.connectionState;
    }

    getShowName(): string | undefined {
        if (!this.showName) {
            return;
        }

        return this.showName;
    }

    private handleOscMessage(msg: EosOscMessage) {
        // console.debug('OSC message:', msg);

        if (msg.address.startsWith('/eos/out/get/')) {
            // Explicit reply to a request, route to request manager

            const deferred = this.inflightRequests.shift();
            if (!deferred) {
                throw new Error('unsolicited /eos/out/get response');
            }

            deferred.resolve(msg);

            // if (msg.address === '/eos/out/get/cue/1/count') {
            //     if (msg.args.length < 1) {
            //         console.warn(
            //             `Unexpected argument count for message "${msg.address}" (expect at least 1, got ${msg.args.length})`,
            //         );
            //         return;
            //     }
            // } else if (GET_CUE_OSC_ADDRESS.test(msg.address)) {
            //     this.handleCueMessage(msg);
            // }
        } else if (msg.address.startsWith('/eos/out/notify/')) {
            // Show data change events (following /eos/subscribe = 1)
            // if (CUE_CHANGED_OSC_ADDRESS.test(msg.address)) {
            //     const changedTargets = expandTargetNumberArguments(
            //         msg.args.slice(1),
            //     );
            //     for (const cueNumber of changedTargets) {
            //         const getCueMsg: EosOscMessage = {
            //             address: `/eos/get/cue/1/${cueNumber}`,
            //             args: [],
            //         };
            //         this.socket?.writeOsc(getCueMsg);
            //     }
            // }
        } else if (msg.address.startsWith('/eos/out/')) {
            // Implicit output
            const implicitOutput = parseImplicitOutput(msg);

            if (implicitOutput) {
                switch (implicitOutput.kind) {
                    case 'show-name':
                        this.showName = implicitOutput.data;
                        break;
                    case 'active-cue':
                        // this.activeCueNumber = implicitOutput.data;
                        break;
                    case 'pending-cue':
                        // this.pendingCueNumber = implicitOutput.data;
                        break;
                }

                this.emit(implicitOutput.kind, implicitOutput.data);
            }
        } else {
            // Arbitrary output
            console.debug('OSC message:', msg);
        }
    }

    private handleOscError(err: Error) {
        console.error('OSC connection error:', err);
    }

    private async request(msg: EosOscMessage) {
        const awaiter = new Deferred<EosOscMessage>();

        this.inflightRequests.push(awaiter);
        await this.socket?.writeOsc(msg);

        return awaiter.promise;
    }

    private async requestMultiple(msg: EosOscMessage, responseCount: number) {
        const awaiters: Deferred<EosOscMessage>[] = [];

        for (let i = 0; i < responseCount; i++) {
            awaiters.push(new Deferred<EosOscMessage>());
        }

        this.inflightRequests.push(...awaiters);
        await this.socket?.writeOsc(msg);

        return Promise.all(awaiters.map(a => a.promise));
    }

    // private handleCueMessage(msg: EosOscMessage) {
    //     // Address: /eos/out/get/cue/<cue list number>/<cue number>/<cue part number>
    //     //
    //     // Arguments:
    //     //      0: <uint32: index>
    //     //      1: <string: OSC UID>
    //     //      2: <string: label>
    //     //      3: <uint32: up time duration (ms)>
    //     //      4: <uint32: up time delay (ms)>
    //     //      5: <uint32: down time duration (ms)>
    //     //      6: <uint32: down time delay (ms)>
    //     //      7: <uint32: focus time duration (ms)>
    //     //      8: <uint32: focus time delay (ms)>
    //     //      9: <uint32: color time duration (ms)>
    //     //     10: <uint32: color time delay (ms)>
    //     //     11: <uint32: beam time duration (ms)>
    //     //     12: <uint32: beam time delay (ms)>
    //     //     13: <bool: preheat>
    //     //     14: <OSC Number: curve>
    //     //     15: <uint32: rate>
    //     //     16: <string: mark>
    //     //     17: <string: block>
    //     //     18: <string: assert>
    //     //     19: <OSC Number: link> or <string: link> (string if links to a separate cue list)
    //     //     20: <uint32: follow time (ms)>
    //     //     21: <uint32: hang time (ms)>
    //     //     22: <bool: all fade>
    //     //     23: <uint32: loop>
    //     //     24: <bool: solo>
    //     //     25: <string: timecode>
    //     //     26: <uint32: part count> (not including base cue, so zero for cues with no parts)
    //     //     27: <notes>
    //     //     28: <scene (text)>
    //     //     29: <bool: scene end>
    //     //     30: <cue part index> (-1 if not a part of a cue, the index otherwise)

    //     const addressParts = msg.address.split('/');

    //     // We don't care about cue actions, fx, links
    //     if (addressParts.length > 8) {
    //         return;
    //     }

    //     const args = msg.args;

    //     const uid = args[1];
    //     const cueNumber = addressParts[6];

    //     if (!uid) {
    //         // Cue no longer exists on the console; find our copy and delete it
    //         const deletedCueUid =
    //             this.recordTargetUidByCueNumber.get(cueNumber);

    //         if (deletedCueUid) {
    //             this.recordTargetUidByCueNumber.delete(cueNumber);
    //             const deletedCue =
    //                 this.cuesByRecordTargetUid.get(deletedCueUid)!;
    //             this.cuesByRecordTargetUid.delete(deletedCueUid);

    //             this.emit('cueDelete', deletedCue);
    //         }

    //         return;
    //     }

    //     // At this point the cue was either added or updated

    //     if (args.length < 31) {
    //         console.error(
    //             `Cannot process cue message arguments (expect at least 31, got ${msg.args.length})`,
    //         );
    //         return;
    //     }

    //     const isPart = args[30] >= 0;

    //     // TODO: handle cue parts
    //     if (isPart) {
    //         return;
    //     }

    //     const cue: Cue = {
    //         cueListNumber: Number(addressParts[5]),
    //         cueNumber,
    //         cuePartNumber: Number(addressParts[7]),
    //         isPart,
    //         isSceneEnd: !!args[29],
    //         label: args[2],
    //         notes: args[27],
    //         scene: args[28],
    //         uid,
    //     };

    //     const updating = this.cuesByRecordTargetUid.has(uid);

    //     this.cuesByRecordTargetUid.set(uid, cue);
    //     this.recordTargetUidByCueNumber.set(cueNumber, uid);

    //     this.emit(updating ? 'cueUpdate' : 'cueCreate', cue);
    // }

    // FIXME: this only exists to allow some quick and dirty testing!
    emit(eventName: string | symbol, ...args: unknown[]): boolean {
        console.log(
            `Event: ${String(eventName)} - ${args
                .map(a => inspect(a))
                .join(', ')}`,
        );

        return super.emit(eventName, ...args);
    }
}
