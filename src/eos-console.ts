import { EventEmitter } from 'node:events';
import { inspect } from 'node:util';
import { parseImplicitOutput } from './eos-implicit-output';
import { EosOscMessage, EosOscStream } from './eos-osc-stream';
import { RecordTargetType } from './record-targets';
import {
    unpackCue,
    unpackCueList,
    unpackGroup,
    unpackMacro,
} from './osc-record-target-parser';
import { RequestManager } from './request-manager';

export type EosConnectionState = 'disconnected' | 'connecting' | 'connected';

export class EosConsole extends EventEmitter {
    private socket: EosOscStream | null = null;
    private connectionState: EosConnectionState = 'disconnected';

    private requestManager = new RequestManager();

    private eosVersion: string | null = null;
    private showName: string | null = null;

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

        this.requestManager.cancelAll(new Error('connection closed'));
    }

    async getVersion() {
        const response = await this.request({
            address: '/eos/get/version',
            args: [],
        });

        return response[0].args[0] as string;
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

    get consoleConnectionState(): EosConnectionState {
        return this.connectionState;
    }

    getShowName(): string | undefined {
        if (!this.showName) {
            return;
        }

        return this.showName;
    }

    async getCues(cueList: number) {
        const count = await this.getRecordTargetListCount('cue', { cueList });
        const requests = new Array(count);

        for (let i = 0; i < count; i++) {
            requests[i] = this.request(
                {
                    address: `/eos/get/cue/${cueList}/index/${i}`,
                    args: [],
                },
                true,
                4,
            );
        }

        const responses = await Promise.all(requests);

        return responses.map(unpackCue);
    }

    async getCueList(listNumber: number) {
        const responses = await this.request(
            {
                address: `/eos/get/cuelist/${listNumber}`,
                args: [],
            },
            true,
            2,
        );

        console.log(responses);

        if (responses[0].args[1] === undefined) {
            return null;
        }

        return unpackCueList(responses);
    }

    async getCueLists() {
        const count = await this.getRecordTargetListCount('cuelist');
        const requests = new Array(count);

        for (let i = 0; i < count; i++) {
            requests[i] = this.request(
                {
                    address: `/eos/get/cuelist/index/${i}`,
                    args: [],
                },
                true,
                2,
            );
        }

        const responses = await Promise.all(requests);

        return responses.map(unpackCueList);
    }

    async getGroups() {
        const count = await this.getRecordTargetListCount('group');
        const requests = new Array(count);

        for (let i = 0; i < count; i++) {
            requests[i] = this.request(
                {
                    address: `/eos/get/group/index/${i}`,
                    args: [],
                },
                true,
                2,
            );
        }

        const responses = await Promise.all(requests);

        return responses.map(unpackGroup);
    }

    async getMacros() {
        const count = await this.getRecordTargetListCount('macro');
        const requests = new Array(count);

        for (let i = 0; i < count; i++) {
            requests[i] = this.request(
                {
                    address: `/eos/get/macro/index/${i}`,
                    args: [],
                },
                true,
                2,
            );
        }

        const responses = await Promise.all(requests);

        return responses.map(unpackMacro);
    }

    /**
     * Note:
     *   - if target type doesn't exist, Eos will simply not reply and the request will fail to resolve
     *   - if a cue list doesn't exist, Eos will reply with 0
     */
    private async getRecordTargetListCount(
        targetType: RecordTargetType,
        options?: { cueList: number },
    ): Promise<number> {
        let address: string;

        if (targetType === 'cue') {
            address = `/eos/get/cue/${options!.cueList}/count`;
        } else {
            address = `/eos/get/${targetType}/count`;
        }

        const response = await this.request({
            address,
            args: [],
        });

        return response[0].args[0] as number;
    }

    private handleOscMessage(msg: EosOscMessage) {
        // console.debug('OSC message:', msg);

        if (msg.address.startsWith('/eos/out/get/')) {
            this.requestManager.handleResponse(msg);
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
            console.debug('Explicit output:', msg);
        }
    }

    private handleOscError(err: Error) {
        console.error('OSC connection error:', err);
    }

    private async request(
        msg: EosOscMessage,
        isRecordTarget = false,
        expectedResponseCount = 1,
    ) {
        const response = this.requestManager.register(
            msg,
            isRecordTarget,
            expectedResponseCount,
        );

        await this.socket?.writeOsc(msg);

        return response;
    }

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
