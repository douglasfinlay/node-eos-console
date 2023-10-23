import { EventEmitter } from 'node:events';
import { inspect } from 'node:util';
import { parseImplicitOutput } from './eos-implicit-output';
import { EosOscMessage, EosOscStream } from './eos-osc-stream';
import { Cue, RecordTargetType, RecordTargets } from './record-targets';
import { RequestManager } from './request-manager';
import { expandTargetNumberArguments } from './target-number';
import {
    EosRecordTargetCountRequest,
    EosRecordTargetRequest,
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

    async getCue(cueList: number, targetNumber: number) {
        return await this.request(
            EosRecordTargetRequest.get('cue', targetNumber, cueList),
        );
    }

    async getCues(cueList: number) {
        const count = await this.request(
            new EosRecordTargetCountRequest('cue', cueList),
        );

        const requests: Promise<Cue | null>[] = new Array(count);

        for (let i = 0; i < count; i++) {
            requests[i] = this.request(
                EosRecordTargetRequest.index('cue', i, cueList),
            );
        }

        const cues = await Promise.all(requests);

        if (cues.includes(null)) {
            throw new Error(
                'null record target found when requesting record target list "cue"',
            );
        }

        return cues as Cue[];
    }

    async getCueList(cueList: number) {
        return await this.request(
            EosRecordTargetRequest.get('cuelist', cueList),
        );
    }

    async getCueLists() {
        return await this.getRecordTargetList('cuelist');
    }

    getCurve(targetNumber: string): never {
        throw new Error('not implemented');
    }

    async getCurves() {
        throw new Error('not implemented');
    }

    async getGroup(targetNumber: number) {
        return await this.request(
            EosRecordTargetRequest.get('group', targetNumber),
        );
    }

    async getGroups() {
        return await this.getRecordTargetList('group');
    }

    getEffect(targetNumber: string): never {
        throw new Error('not implemented');
    }

    async getEffects() {
        throw new Error('not implemented');
    }

    async getMacro(targetNumber: number) {
        return await this.request(
            EosRecordTargetRequest.get('macro', targetNumber),
        );
    }

    async getMacros() {
        return await this.getRecordTargetList('macro');
    }

    getMagicSheet(targetNumber: string): never {
        throw new Error('not implemented');
    }

    async getMagicSheets() {
        throw new Error('not implemented');
    }

    getPatchEntry(targetNumber: string): never {
        throw new Error('not implemented');
    }

    async getPatch() {
        throw new Error('not implemented');
    }

    getPreset(targetNumber: string): never {
        throw new Error('not implemented');
    }

    async getPresets() {
        throw new Error('not implemented');
    }

    getIntensityPalette(targetNumber: string): never {
        throw new Error('not implemented');
    }

    async getIntensityPalettes() {
        throw new Error('not implemented');
    }

    getFocusPalette(targetNumber: string): never {
        throw new Error('not implemented');
    }

    async getFocusPalettes() {
        throw new Error('not implemented');
    }

    getColorPalette(targetNumber: string): never {
        throw new Error('not implemented');
    }

    async getColorPalettes() {
        throw new Error('not implemented');
    }

    getBeamPalette(targetNumber: string): never {
        throw new Error('not implemented');
    }

    async getBeamPalettes() {
        throw new Error('not implemented');
    }

    getPixmap(targetNumber: string): never {
        throw new Error('not implemented');
    }

    async getPixmaps() {
        throw new Error('not implemented');
    }

    getSnapshot(targetNumber: string): never {
        throw new Error('not implemented');
    }

    async getSnapshots() {
        throw new Error('not implemented');
    }

    getSub(targetNumber: string): never {
        throw new Error('not implemented');
    }

    async getSubs() {
        throw new Error('not implemented');
    }

    private async getRecordTargetList<
        TTargetType extends Exclude<RecordTargetType, 'cue'>,
    >(targetType: TTargetType) {
        const count = await this.request(
            new EosRecordTargetCountRequest(targetType),
        );

        const requests: Promise<RecordTargets[TTargetType] | null>[] =
            new Array(count);

        for (let i = 0; i < count; i++) {
            requests[i] = this.request(
                EosRecordTargetRequest.index(targetType, i),
            );
        }

        const recordTargets = await Promise.all(requests);

        if (recordTargets.includes(null)) {
            throw new Error(
                `null record target found when requesting record target list "${recordTargets}"`,
            );
        }

        return recordTargets as RecordTargets[TTargetType][];
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
