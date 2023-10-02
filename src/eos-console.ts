import { EventEmitter } from 'node:events';
import { EosOscArg, EosOscMessage, EosOscStream } from './eos-osc-stream';
import { Cue } from './record-targets';

export type EosConnectionState = 'disconnected' | 'connecting' | 'connected';

type RecordTargetUid = string;

const GET_CUE_OSC_ADDRESS =
    /^\/eos\/out\/get\/cue\/1\/(?<cueNumber>\d+|\d+.\d+)/;

const ACTIVE_CUE_OSC_ADDRESS =
    /^\/eos\/out\/active\/cue\/1\/(?<cueNumber>\d+|\d+.\d+$)/;

const PENDING_CUE_OSC_ADDRESS =
    /^\/eos\/out\/pending\/cue\/1\/(?<cueNumber>\d+|\d+.\d+$)/;

const CUE_CHANGED_OSC_ADDRESS = /^\/eos\/out\/notify\/cue\/1$/;

// type EosConsoleEvents = {
//     connect: () => void;
//     connectError: (err: Error) => void;
//     connecting: () => void;
//     disconnect: (reason?: string) => void;
//
//     initialSyncComplete: () => void;
//
//     activeCue: (cueNumber: string | null) => void;
//     pendingCue: (cueNumber: string | null) => void;
//
//     cueCreate: (cue: Cue) => void;
//     cueDelete: (cue: Cue) => void;
//     cueUpdate: (cue: Cue) => void;
// };

export class EosConsole extends EventEmitter {
    private socket: EosOscStream | null = null;
    private connectionState: EosConnectionState = 'disconnected';
    private initialSyncComplete = false;

    private eosVersion: string | null = null;
    private showName: string | null = null;

    private cuesCount = 0;
    private cuesLeftToSync = Infinity;
    private cuesByRecordTargetUid = new Map<RecordTargetUid, Cue>();
    private recordTargetUidByCueNumber = new Map<string, RecordTargetUid>();

    private activeCueNumber: string | null = null;
    private pendingCueNumber: string | null = null;

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

        const handleReady = () => {
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

            this.socket?.writeOsc({
                address: '/eos/user',
                args: [0],
            });

            this.socket?.writeOsc({
                address: '/eos/get/version',
                args: [],
            });

            this.socket?.writeOsc({
                address: '/eos/get/cue/1/count',
                args: [],
            });

            this.socket?.writeOsc({
                address: '/eos/subscribe',
                args: [1],
            });
        };

        this.socket = EosOscStream.connect(this.host, this.port);
        this.socket.once('error', handleConnectError);
        this.socket.once('ready', handleReady);
    }

    disconnect() {
        console.log('Disconnecting from EOS console');

        this.socket?.destroy();
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

    getCues(): Cue[] {
        return Array.from(this.cuesByRecordTargetUid.values());
    }

    get activeCue(): Cue | undefined {
        if (!this.activeCueNumber) {
            return;
        }

        for (const cue of this.cuesByRecordTargetUid.values()) {
            if (cue.cueNumber === this.activeCueNumber) {
                return cue;
            }
        }
    }

    get consoleConnectionState(): EosConnectionState {
        return this.connectionState;
    }

    get initialSyncProgress(): number | undefined {
        if (this.initialSyncComplete) {
            return;
        }

        if (!isFinite(this.cuesLeftToSync)) {
            // Haven't yet received the total cue count, so treat sync as not started
            return 0.0;
        }

        return this.cuesLeftToSync <= 0
            ? 1.0
            : 1 - this.cuesLeftToSync / this.cuesCount;
    }

    get isInitialSyncComplete(): boolean {
        return this.initialSyncComplete;
    }

    get pendingCue(): Cue | undefined {
        if (!this.pendingCueNumber) {
            return;
        }

        for (const cue of this.cuesByRecordTargetUid.values()) {
            if (cue.cueNumber === this.pendingCueNumber) {
                return cue;
            }
        }
    }

    getShowName(): string | undefined {
        if (!this.showName) {
            return;
        }

        return this.showName;
    }

    private checkInitialSyncComplete() {
        const complete =
            !!this.eosVersion && !!this.showName && this.cuesLeftToSync === 0;

        this.initialSyncComplete = complete;

        if (complete) {
            this.emit('initialSyncComplete');

            console.log('Initial sync complete');
        }
    }

    private handleOscMessage(msg: EosOscMessage) {
        console.debug('OSC message:', msg);

        if (msg.address === '/eos/out/get/version') {
            if (msg.args.length < 1) {
                console.warn(
                    `Unexpected argument count for message "${msg.address}" (expect at least 1, got ${msg.args.length})`,
                );
                return;
            }

            this.eosVersion = msg.args[0];
            console.log(`EOS version: ${this.eosVersion}`);
        } else if (msg.address === '/eos/out/show/name') {
            if (msg.args.length < 1) {
                console.warn(
                    `Unexpected argument count for message "${msg.address}" (expect at least 1, got ${msg.args.length})`,
                );
                return;
            }

            this.showName = msg.args[0];
        } else if (msg.address === '/eos/out/get/cue/1/count') {
            if (msg.args.length < 1) {
                console.warn(
                    `Unexpected argument count for message "${msg.address}" (expect at least 1, got ${msg.args.length})`,
                );
                return;
            }

            this.cuesCount = msg.args[0];
            this.cuesLeftToSync = msg.args[0];

            for (let i = 0; i < this.cuesLeftToSync; i++) {
                this.socket?.writeOsc({
                    address: `/eos/get/cue/1/index/${i}`,
                    args: [],
                });
            }
        } else if (GET_CUE_OSC_ADDRESS.test(msg.address)) {
            this.handleCueMessage(msg);
        } else if (ACTIVE_CUE_OSC_ADDRESS.test(msg.address)) {
            this.activeCueNumber = msg.address.split('/')[6];
            this.emit('activeCue', this.activeCueNumber);
        } else if (PENDING_CUE_OSC_ADDRESS.test(msg.address)) {
            this.pendingCueNumber = msg.address.split('/')[6];
            this.emit('pendingCue', this.pendingCueNumber);
        } else if (CUE_CHANGED_OSC_ADDRESS.test(msg.address)) {
            const changedTargets = expandTargetNumberArguments(
                msg.args.slice(1),
            );

            for (const cueNumber of changedTargets) {
                const getCueMsg: EosOscMessage = {
                    address: `/eos/get/cue/1/${cueNumber}`,
                    args: [],
                };

                this.socket?.writeOsc(getCueMsg);
            }
        }

        if (!this.initialSyncComplete) {
            this.checkInitialSyncComplete();
        }
    }

    private handleOscError(err: Error) {
        console.error('OSC connection error:', err);
    }

    private handleCueMessage(msg: EosOscMessage) {
        // Address: /eos/out/get/cue/<cue list number>/<cue number>/<cue part number>
        //
        // Arguments:
        //      0: <uint32: index>
        //      1: <string: OSC UID>
        //      2: <string: label>
        //      3: <uint32: up time duration (ms)>
        //      4: <uint32: up time delay (ms)>
        //      5: <uint32: down time duration (ms)>
        //      6: <uint32: down time delay (ms)>
        //      7: <uint32: focus time duration (ms)>
        //      8: <uint32: focus time delay (ms)>
        //      9: <uint32: color time duration (ms)>
        //     10: <uint32: color time delay (ms)>
        //     11: <uint32: beam time duration (ms)>
        //     12: <uint32: beam time delay (ms)>
        //     13: <bool: preheat>
        //     14: <OSC Number: curve>
        //     15: <uint32: rate>
        //     16: <string: mark>
        //     17: <string: block>
        //     18: <string: assert>
        //     19: <OSC Number: link> or <string: link> (string if links to a separate cue list)
        //     20: <uint32: follow time (ms)>
        //     21: <uint32: hang time (ms)>
        //     22: <bool: all fade>
        //     23: <uint32: loop>
        //     24: <bool: solo>
        //     25: <string: timecode>
        //     26: <uint32: part count> (not including base cue, so zero for cues with no parts)
        //     27: <notes>
        //     28: <scene (text)>
        //     29: <bool: scene end>
        //     30: <cue part index> (-1 if not a part of a cue, the index otherwise)

        const addressParts = msg.address.split('/');

        // We don't care about cue actions, fx, links
        if (addressParts.length > 8) {
            return;
        }

        const args = msg.args;

        const uid = args[1];
        const cueNumber = addressParts[6];

        if (!uid) {
            // Cue no longer exists on the console; find our copy and delete it
            const deletedCueUid =
                this.recordTargetUidByCueNumber.get(cueNumber);

            if (deletedCueUid) {
                this.recordTargetUidByCueNumber.delete(cueNumber);
                const deletedCue =
                    this.cuesByRecordTargetUid.get(deletedCueUid)!;
                this.cuesByRecordTargetUid.delete(deletedCueUid);

                this.emit('cueDelete', deletedCue);
            }

            return;
        }

        // At this point the cue was either added or updated

        if (args.length < 31) {
            console.error(
                `Cannot process cue message arguments (expect at least 31, got ${msg.args.length})`,
            );
            return;
        }

        const isPart = args[30] >= 0;

        // TODO: handle cue parts
        if (isPart) {
            this.cuesLeftToSync--;
            return;
        }

        const cue: Cue = {
            cueListNumber: Number(addressParts[5]),
            cueNumber,
            cuePartNumber: Number(addressParts[7]),
            isPart,
            isSceneEnd: !!args[29],
            label: args[2],
            notes: args[27],
            scene: args[28],
            uid,
        };

        const updating = this.cuesByRecordTargetUid.has(uid);

        this.cuesByRecordTargetUid.set(uid, cue);
        this.recordTargetUidByCueNumber.set(cueNumber, uid);

        if (!this.initialSyncComplete) {
            this.cuesLeftToSync--;
            this.checkInitialSyncComplete();

            return;
        }

        this.emit(updating ? 'cueUpdate' : 'cueCreate', cue);
    }
}

/**
 * Parses and expands a target number range into individual target numbers. Target numbers that are not whole will be
 * kept as strings. For example:
 *   - "1.23" => "1.23"
 *   - "3-5" => [3, 4, 5]
 */
function expandTargetNumberArguments(args: EosOscArg[]): string[] {
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

function parseStringTargetNumberRange(arg: string): string[] {
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
