import { EventEmitter } from 'node:events';
import { inspect } from 'node:util';
import { EosOscMessage, EosOscStream } from './eos-osc-stream';
import {
    Channel,
    ChannelPart,
    Cue,
    Patch,
    RecordTargetType,
    RecordTargets,
    TargetNumber,
} from './record-targets';
import { RequestManager } from './request-manager';
import { expandTargetNumberArguments } from './target-number';
import * as requests from './request';
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
        return this.request(new requests.EosVersionRequest());
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
        return this.request(requests.EosCueRequest.get(targetNumber, cueList));
    }

    async getCues(cueList: TargetNumber) {
        const count = await this.request(
            new requests.EosRecordTargetCountRequest('cue', cueList),
        );

        const cueRequests: Promise<Cue | null>[] = new Array(count);

        for (let i = 0; i < count; i++) {
            cueRequests[i] = this.request(
                requests.EosCueRequest.index(i, cueList),
            );
        }

        const cues = await Promise.all(cueRequests);

        if (cues.includes(null)) {
            throw new Error(
                'null record target found when requesting record target list "cue"',
            );
        }

        return cues as Cue[];
    }

    async getCueList(targetNumber: TargetNumber) {
        return this.request(requests.EosCueListRequest.get(targetNumber));
    }

    async getCueLists() {
        return this.getRecordTargetList('cuelist', i =>
            requests.EosCueListRequest.index(i),
        );
    }

    async getCurve(targetNumber: TargetNumber) {
        return this.request(requests.EosCurveRequest.get(targetNumber));
    }

    async getCurves() {
        return this.getRecordTargetList('curve', i =>
            requests.EosCurveRequest.index(i),
        );
    }

    async getGroup(targetNumber: TargetNumber) {
        return this.request(requests.EosGroupRequest.get(targetNumber));
    }

    async getGroups() {
        return this.getRecordTargetList('group', i =>
            requests.EosGroupRequest.index(i),
        );
    }

    async getEffect(targetNumber: TargetNumber) {
        return this.request(requests.EosEffectRequest.get(targetNumber));
    }

    async getEffects() {
        return this.getRecordTargetList('fx', i =>
            requests.EosEffectRequest.index(i),
        );
    }

    async getMacro(targetNumber: TargetNumber) {
        return this.request(requests.EosMacroRequest.get(targetNumber));
    }

    async getMacros() {
        return this.getRecordTargetList('macro', i =>
            requests.EosMacroRequest.index(i),
        );
    }

    async getMagicSheet(targetNumber: TargetNumber) {
        return this.request(requests.EosMagicSheetRequest.get(targetNumber));
    }

    async getMagicSheets() {
        return this.getRecordTargetList('ms', i =>
            requests.EosMagicSheetRequest.index(i),
        );
    }

    async getChannel(targetNumber: TargetNumber) {
        // Make an initial request to determine the number of parts
        const firstPart = await this.request(
            requests.EosPatchRequest.get(targetNumber, 1),
        );

        if (!firstPart) {
            return null;
        }

        // Request the remaining parts if there are any
        const remainingPartRequests: Promise<Patch | null>[] = [];

        for (let part = 2; part <= firstPart.partCount; part++) {
            remainingPartRequests.push(
                this.request(requests.EosPatchRequest.get(targetNumber, part)),
            );
        }

        const remainingParts = await Promise.all(remainingPartRequests);

        if (remainingParts.includes(null)) {
            throw new Error(
                `null part found when requesting channel ${targetNumber}`,
            );
        }

        return transformPatchToChannel([
            firstPart,
            ...(remainingParts as Patch[]),
        ]);
    }

    async getPatch() {
        const patch = await this.getRecordTargetList('patch', i =>
            requests.EosPatchRequest.index(i),
        );

        const patchByTargetNumber = patch.reduce<Record<number, Patch[]>>(
            (group, entry) => {
                const { targetNumber } = entry;
                group[targetNumber] = group[targetNumber] ?? [];
                group[targetNumber].push(entry);

                return group;
            },
            {},
        );

        return Object.values(patchByTargetNumber).map(transformPatchToChannel);
    }

    async getPreset(targetNumber: TargetNumber) {
        return this.request(requests.EosPresetRequest.get(targetNumber));
    }

    async getPresets() {
        return this.getRecordTargetList('preset', i =>
            requests.EosPresetRequest.index(i),
        );
    }

    async getIntensityPalette(targetNumber: TargetNumber) {
        return this.request(requests.EosPaletteRequest.get(targetNumber, 'ip'));
    }

    async getIntensityPalettes() {
        return this.getRecordTargetList('ip', i =>
            requests.EosPaletteRequest.index(i, 'ip'),
        );
    }

    async getFocusPalette(targetNumber: TargetNumber) {
        return this.request(requests.EosPaletteRequest.get(targetNumber, 'fp'));
    }

    async getFocusPalettes() {
        return this.getRecordTargetList('fp', i =>
            requests.EosPaletteRequest.index(i, 'fp'),
        );
    }

    async getColorPalette(targetNumber: TargetNumber) {
        return this.request(requests.EosPaletteRequest.get(targetNumber, 'cp'));
    }

    async getColorPalettes() {
        return this.getRecordTargetList('cp', i =>
            requests.EosPaletteRequest.index(i, 'cp'),
        );
    }

    async getBeamPalette(targetNumber: TargetNumber) {
        return this.request(requests.EosPaletteRequest.get(targetNumber, 'bp'));
    }

    async getBeamPalettes() {
        return this.getRecordTargetList('bp', i =>
            requests.EosPaletteRequest.index(i, 'bp'),
        );
    }

    async getPixmap(targetNumber: TargetNumber) {
        return this.request(requests.EosPixelMapRequest.get(targetNumber));
    }

    async getPixmaps() {
        return this.getRecordTargetList('pixmap', i =>
            requests.EosPixelMapRequest.index(i),
        );
    }

    async getSnapshot(targetNumber: TargetNumber) {
        return this.request(requests.EosSnapshotRequest.get(targetNumber));
    }

    async getSnapshots() {
        return this.getRecordTargetList('snap', i =>
            requests.EosSnapshotRequest.index(i),
        );
    }

    async getSub(targetNumber: TargetNumber) {
        return this.request(requests.EosSubRequest.get(targetNumber));
    }

    async getSubs() {
        return this.getRecordTargetList('sub', i =>
            requests.EosSubRequest.index(i),
        );
    }

    private async getRecordTargetList<
        TTargetType extends Exclude<RecordTargetType, 'cue'>,
    >(
        targetType: TTargetType,
        indexRequestFactory: (
            index: number,
        ) => requests.EosRecordTargetRequest<RecordTargets[TTargetType]>,
    ) {
        const count = await this.request(
            new requests.EosRecordTargetCountRequest(targetType),
        );

        if (count === 0) {
            return [];
        }

        const requestPromises: Promise<RecordTargets[TTargetType] | null>[] =
            new Array(count);

        for (let i = 0; i < count; i++) {
            requestPromises[i] = this.request(indexRequestFactory(i));
        }

        const recordTargets = await Promise.all(requestPromises);

        if (recordTargets.includes(null)) {
            throw new Error(
                `null record target found when requesting record target list "${targetType}"`,
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

    private async request<T>(request: requests.EosRequest<T>): Promise<T> {
        const response = this.requestManager.register(request);

        await this.socket?.writeOsc(request.outboundMessage);

        return response;
    }
}

function transformPatchToChannel(patchParts: Patch[]): Channel {
    const transformKeys: (keyof ChannelPart)[] = [
        'uid',
        'label',
        'address',
        'currentLevel',
        'fixtureManufacturer',
        'fixtureModel',
        'gel',
        'intensityParameterAddress',
        'notes',
        'text1',
        'text2',
        'text3',
        'text4',
        'text5',
        'text6',
        'text7',
        'text8',
        'text9',
        'text10',
    ];

    const targetNumber = patchParts[0].targetNumber;
    const parts = patchParts.map(part => {
        if (part.targetNumber !== targetNumber) {
            throw new Error(
                'unexpected target number when transforming patch entry',
            );
        }

        return Object.fromEntries(
            transformKeys
                .filter(key => key in part)
                .map(key => [key, part[key]]),
        ) as ChannelPart;
    });

    return {
        targetType: 'patch',
        targetNumber,
        parts,
    };
}
