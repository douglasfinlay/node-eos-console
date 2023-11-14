import { EventEmitter } from 'node:events';
import { inspect } from 'node:util';
import { EosOscMessage, EosOscStream } from './eos-osc-stream';
import {
    Cue,
    RecordTargetType,
    RecordTargets,
    TargetNumber,
} from './record-targets';
import { RequestManager } from './request-manager';
import { expandTargetNumberArguments } from './target-number';
import {
    EosRecordTargetCountRequest,
    EosRecordTargetRequest,
    EosRequest,
    EosVersionRequest,
} from './request';
import { OscRouter } from './osc-router';
import { EOS_IMPLICIT_OUTPUT } from './eos-implicit-output';

export type EosConnectionState = 'disconnected' | 'connecting' | 'connected';

export class EosConsole extends EventEmitter {
    private socket: EosOscStream | null = null;
    private connectionState: EosConnectionState = 'disconnected';

    private router = new OscRouter();
    private requestManager = new RequestManager();

    private eosVersion: string | null = null;
    private showName: string | null = null;

    constructor(
        public readonly host: string,
        public readonly port = 3037,
    ) {
        super();

        this.initRoutes();
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
            this.socket?.on('data', this.router.route.bind(this.router));

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
        return this.request(new EosVersionRequest());
    }

    async changeUser(userId: number) {
        await this.socket?.writeOsc({
            address: '/eos/user',
            args: [userId],
        });
    }

    async executeCommand(
        command: string,
        substitutions: string[] = [],
        newCommand = true,
    ) {
        const msg: EosOscMessage = {
            address: newCommand ? '/eos/newcmd' : '/eos/cmd',
            args: [command, ...substitutions],
        };

        await this.socket?.writeOsc(msg);
    }

    async fireCue(cueListNumber: TargetNumber, cueNumber: TargetNumber) {
        const msg: EosOscMessage = {
            address: `/eos/cue/${cueListNumber}/${cueNumber}/fire`,
            args: [],
        };

        await this.socket?.writeOsc(msg);
    }

    getShowName(): string | undefined {
        if (!this.showName) {
            return;
        }

        return this.showName;
    }

    async getCue(cueList: TargetNumber, targetNumber: TargetNumber) {
        return this.request(
            EosRecordTargetRequest.get('cue', targetNumber, cueList),
        );
    }

    async getCues(cueList: TargetNumber) {
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

    async getCueList(cueList: TargetNumber) {
        return this.request(EosRecordTargetRequest.get('cuelist', cueList));
    }

    async getCueLists() {
        return this.getRecordTargetList('cuelist');
    }

    async getCurve(targetNumber: TargetNumber) {
        return this.request(EosRecordTargetRequest.get('curve', targetNumber));
    }

    async getCurves() {
        return this.getRecordTargetList('curve');
    }

    async getGroup(targetNumber: TargetNumber) {
        return this.request(EosRecordTargetRequest.get('group', targetNumber));
    }

    async getGroups() {
        return this.getRecordTargetList('group');
    }

    async getEffect(targetNumber: TargetNumber) {
        return this.request(EosRecordTargetRequest.get('fx', targetNumber));
    }

    async getEffects() {
        return this.getRecordTargetList('fx');
    }

    async getMacro(targetNumber: TargetNumber) {
        return this.request(EosRecordTargetRequest.get('macro', targetNumber));
    }

    async getMacros() {
        return this.getRecordTargetList('macro');
    }

    async getMagicSheet(targetNumber: TargetNumber) {
        return this.request(EosRecordTargetRequest.get('ms', targetNumber));
    }

    async getMagicSheets() {
        return this.getRecordTargetList('ms');
    }

    async getPatchChannel(targetNumber: TargetNumber) {
        throw new Error('not implemented');
    }

    async getPatch() {
        return this.getRecordTargetList('patch');
    }

    async getPreset(targetNumber: TargetNumber) {
        return this.request(EosRecordTargetRequest.get('preset', targetNumber));
    }

    async getPresets() {
        return this.getRecordTargetList('preset');
    }

    async getIntensityPalette(targetNumber: TargetNumber) {
        return this.request(EosRecordTargetRequest.get('ip', targetNumber));
    }

    async getIntensityPalettes() {
        return this.getRecordTargetList('ip');
    }

    async getFocusPalette(targetNumber: TargetNumber) {
        return this.request(EosRecordTargetRequest.get('fp', targetNumber));
    }

    async getFocusPalettes() {
        return this.getRecordTargetList('fp');
    }

    async getColorPalette(targetNumber: TargetNumber) {
        return this.request(EosRecordTargetRequest.get('cp', targetNumber));
    }

    async getColorPalettes() {
        return this.getRecordTargetList('cp');
    }

    async getBeamPalette(targetNumber: TargetNumber) {
        return this.request(EosRecordTargetRequest.get('bp', targetNumber));
    }

    async getBeamPalettes() {
        return this.getRecordTargetList('bp');
    }

    async getPixmap(targetNumber: TargetNumber) {
        return this.request(EosRecordTargetRequest.get('pixmap', targetNumber));
    }

    async getPixmaps() {
        return this.getRecordTargetList('pixmap');
    }

    async getSnapshot(targetNumber: TargetNumber) {
        return this.request(EosRecordTargetRequest.get('snap', targetNumber));
    }

    async getSnapshots() {
        return this.getRecordTargetList('snap');
    }

    async getSub(targetNumber: TargetNumber) {
        return this.request(EosRecordTargetRequest.get('sub', targetNumber));
    }

    async getSubs() {
        return this.getRecordTargetList('sub');
    }

    private async getRecordTargetList<
        TTargetType extends Exclude<RecordTargetType, 'cue'>,
    >(targetType: TTargetType) {
        const count = await this.request(
            new EosRecordTargetCountRequest(targetType),
        );

        if (count === 0) {
            return [];
        }

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

    private emitRecordTargetChange(
        targetType: RecordTargetType,
        targetNumberArgs: unknown[],
        ...extraArgs: unknown[]
    ) {
        const targetNumbers = expandTargetNumberArguments(targetNumberArgs);
        this.emit('record-target-change', targetType, targetNumbers, extraArgs);
    }

    private handleOscError(err: Error) {
        console.error('OSC connection error:', err);
    }

    private initRoutes() {
        for (const [route, handler] of Object.entries(EOS_IMPLICIT_OUTPUT)) {
            this.router.on(route, (message, params) => {
                const implicitOutput = handler(message, params);

                switch (implicitOutput.type) {
                    case 'show-name':
                        this.showName = implicitOutput.showName;
                        break;
                }

                const { type: event, ...payload } = implicitOutput;
                this.emit(event, payload);
            });
        }

        this.router
            .on('/eos/out/get/*', message =>
                this.requestManager.handleResponse(message),
            )
            .on('/eos/out/notify/cue/{cueList}', (message, params) => {
                this.emitRecordTargetChange(
                    'cue',
                    message.args.slice(1),
                    Number(params.cueList),
                );
            })
            .on('/eos/out/notify/{targetType}', (message, params) => {
                this.emitRecordTargetChange(
                    params.targetType as RecordTargetType,
                    message.args.slice(1),
                );
            })
            .on('/eos/*', message =>
                console.warn(
                    `Unhandled OSC message "${
                        message.address
                    }", args: [ ${message.args
                        .map(arg => JSON.stringify(arg))
                        .join(',')} ]`,
                ),
            )
            .on('/*', message => this.emit('osc', message));
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

    private async request<T>(request: EosRequest<T>): Promise<T> {
        const response = this.requestManager.register(request);

        await this.socket?.writeOsc(request.outboundMessage);

        return response;
    }
}
