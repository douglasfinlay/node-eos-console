import { EventEmitter } from 'node:events';
import { inspect } from 'node:util';
import { parseImplicitOutput } from './eos-implicit-output';
import { EosOscMessage, EosOscStream } from './eos-osc-stream';
import { RecordTargetType } from './record-targets';
import { RequestManager } from './request-manager';
import { expandTargetNumberArguments } from './target-number';
import {
    EosRecordTargetCountRequest,
    EosRequest,
    EosResponseType,
    EosVersionRequest,
} from './request';

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

    get consoleConnectionState(): EosConnectionState {
        return this.connectionState;
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

            await this.subscribe();
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

    async getVersion(): Promise<string> {
        return await this.request(new EosVersionRequest());
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

    getShowName(): string | undefined {
        if (!this.showName) {
            return;
        }

        return this.showName;
    }

    getCue(cueList: number, targetNumber: string): never {
        throw new Error('not implemented');
    }

    async getCues(cueList: number) {
        const count = await this.request(
            new EosRecordTargetCountRequest('cue', cueList),
        );

        console.log(`Cues (${cueList}):`, count);

        // const count = await this.getRecordTargetListCount('cue', { cueList });
        // const requests = new Array(count);
        // for (let i = 0; i < count; i++) {
        //     requests[i] = this.request(
        //         {
        //             address: `/eos/get/cue/${cueList}/index/${i}`,
        //             args: [],
        //         },
        //         true,
        //         4,
        //     );
        // }
        // const responses = await Promise.all(requests);
        // return responses.map(unpackCue);
    }

    async getCueList(cueList: number) {
        // const responses = await this.request(
        //     {
        //         address: `/eos/get/cuelist/${cueList}`,
        //         args: [],
        //     },
        //     true,
        //     2,
        // );
        // console.log(responses);
        // if (responses[0].args[1] === undefined) {
        //     return null;
        // }
        // return unpackCueList(responses);
    }

    async getCueLists() {
        const count = await this.request(
            new EosRecordTargetCountRequest('cuelist'),
        );

        console.log('Cue lists:', count);

        // const count = await this.getRecordTargetListCount('cuelist');
        // const requests = new Array(count);
        // for (let i = 0; i < count; i++) {
        //     requests[i] = this.request(
        //         {
        //             address: `/eos/get/cuelist/index/${i}`,
        //             args: [],
        //         },
        //         true,
        //         2,
        //     );
        // }
        // const responses = await Promise.all(requests);
        // return responses.map(unpackCueList);
    }

    getCurve(targetNumber: string): never {
        throw new Error('not implemented');
    }

    async getCurves() {
        const count = await this.request(
            new EosRecordTargetCountRequest('curve'),
        );

        console.log('Curves:', count);
    }

    getGroup(targetNumber: string): never {
        throw new Error('not implemented');
    }

    async getGroups() {
        const count = await this.request(
            new EosRecordTargetCountRequest('group'),
        );

        console.log('Groups:', count);

        // const count = await this.getRecordTargetListCount('group');
        // const requests = new Array(count);
        // for (let i = 0; i < count; i++) {
        //     requests[i] = this.request(
        //         {
        //             address: `/eos/get/group/index/${i}`,
        //             args: [],
        //         },
        //         true,
        //         2,
        //     );
        // }
        // const responses = await Promise.all(requests);
        // return responses.map(unpackGroup);
    }

    getEffect(targetNumber: string): never {
        throw new Error('not implemented');
    }

    async getEffects() {
        const count = await this.request(new EosRecordTargetCountRequest('fx'));

        console.log('Effects:', count);
    }

    getMacro(targetNumber: string): never {
        throw new Error('not implemented');
    }

    async getMacros() {
        const count = await this.request(
            new EosRecordTargetCountRequest('macro'),
        );

        console.log('Macros:', count);

        // const count = await this.getRecordTargetListCount('macro');
        // const requests = new Array(count);
        // for (let i = 0; i < count; i++) {
        //     requests[i] = this.request(
        //         {
        //             address: `/eos/get/macro/index/${i}`,
        //             args: [],
        //         },
        //         true,
        //         2,
        //     );
        // }
        // const responses = await Promise.all(requests);
        // return responses.map(unpackMacro);
    }

    getMagicSheet(targetNumber: string): never {
        throw new Error('not implemented');
    }

    async getMagicSheets() {
        const count = await this.request(new EosRecordTargetCountRequest('ms'));

        console.log('Magic sheets:', count);
    }

    getPatchEntry(targetNumber: string): never {
        throw new Error('not implemented');
    }

    async getPatch() {
        const count = await this.request(
            new EosRecordTargetCountRequest('patch'),
        );

        console.log('Patch:', count);
    }

    getPreset(targetNumber: string): never {
        throw new Error('not implemented');
    }

    async getPresets() {
        const count = await this.request(
            new EosRecordTargetCountRequest('preset'),
        );

        console.log('Presets:', count);
    }

    getIntensityPalette(targetNumber: string): never {
        throw new Error('not implemented');
    }

    async getIntensityPalettes() {
        const count = await this.request(new EosRecordTargetCountRequest('ip'));

        console.log('IPs:', count);
    }

    getFocusPalette(targetNumber: string): never {
        throw new Error('not implemented');
    }

    async getFocusPalettes() {
        const count = await this.request(new EosRecordTargetCountRequest('fp'));

        console.log('FPs:', count);
    }

    getColorPalette(targetNumber: string): never {
        throw new Error('not implemented');
    }

    async getColorPalettes() {
        const count = await this.request(new EosRecordTargetCountRequest('cp'));

        console.log('CPs:', count);
    }

    getBeamPalette(targetNumber: string): never {
        throw new Error('not implemented');
    }

    async getBeamPalettes() {
        const count = await this.request(new EosRecordTargetCountRequest('bp'));

        console.log('BPs:', count);
    }

    getPixmap(targetNumber: string): never {
        throw new Error('not implemented');
    }

    async getPixmaps() {
        const count = await this.request(
            new EosRecordTargetCountRequest('pixmap'),
        );

        console.log('Pixmaps:', count);
    }

    getSnapshot(targetNumber: string): never {
        throw new Error('not implemented');
    }

    async getSnapshots() {
        const count = await this.request(
            new EosRecordTargetCountRequest('snap'),
        );

        console.log('Snapshots:', count);
    }

    getSub(targetNumber: string): never {
        throw new Error('not implemented');
    }

    async getSubs() {
        const count = await this.request(
            new EosRecordTargetCountRequest('sub'),
        );

        console.log('Subs:', count);
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

    /**
     * Note:
     *   - if target type doesn't exist, Eos will simply not reply and the request will fail to resolve
     *   - if a cue list doesn't exist, Eos will reply with 0
     */
    private async getRecordTargetListCount(
        targetType: RecordTargetType,
        options?: { cueList: number },
    ) {
        // let address: string;
        // if (targetType === 'cue') {
        //     if (!options?.cueList) {
        //         throw new TypeError('options.cueList must be provided');
        //     }
        //     address = `/eos/get/cue/${options.cueList}/count`;
        // } else {
        //     address = `/eos/get/${targetType}/count`;
        // }
        // const response = await this.request({
        //     address,
        //     args: [],
        // });
        // return response[0].args[0] as number;
    }

    private handleOscMessage(msg: EosOscMessage) {
        // console.debug('OSC message:', msg);

        if (msg.address.startsWith('/eos/')) {
            if (msg.address.startsWith('/eos/out/get/')) {
                this.requestManager.handleResponse(msg);
            } else if (msg.address.startsWith('/eos/out/notify/')) {
                this.handleNotifyMessage(msg);
            } else if (msg.address.startsWith('/eos/out/')) {
                this.handleImplicitOutputMessage(msg);
            } else {
                console.warn('Unrecognised Eos output:', msg);
            }
        } else {
            this.emit('osc', msg);
        }
    }

    private handleImplicitOutputMessage(msg: EosOscMessage) {
        const implicitOutput = parseImplicitOutput(msg);

        if (implicitOutput) {
            switch (implicitOutput.kind) {
                case 'show-name':
                    this.showName = implicitOutput.data;
                    break;
            }

            this.emit(implicitOutput.kind, implicitOutput.data);
        }
    }

    private handleNotifyMessage(msg: EosOscMessage) {
        const addressParts = msg.address.split('/');
        const targetType = addressParts[4] as RecordTargetType;
        const targetNumbers = expandTargetNumberArguments(msg.args.slice(1));

        if (targetType === 'cue') {
            const cueList = addressParts[5];
            this.emit(
                'record-target-change',
                targetType,
                targetNumbers,
                cueList,
            );
        } else {
            this.emit('record-target-change', targetType, targetNumbers);
        }
    }

    private handleOscError(err: Error) {
        console.error('OSC connection error:', err);
    }

    private async subscribe(subscribe = true) {
        await this.socket?.writeOsc({
            address: '/eos/subscribe',
            args: [
                {
                    type: 'integer',
                    value: +subscribe,
                },
            ],
        });
    }

    private async request<T extends EosResponseType<EosRequest>>(
        request: EosRequest<T>,
    ): Promise<T> {
        const response = this.requestManager.register(request);

        await this.socket?.writeOsc(request.outboundMessage);

        return response;
    }
}
