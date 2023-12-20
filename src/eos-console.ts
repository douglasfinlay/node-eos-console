import { EventEmitter } from 'node:events';
import { inspect } from 'node:util';
import { EOS_IMPLICIT_OUTPUT, EosImplicitOutput } from './eos-implicit-output';
import { EosOscStream } from './eos-osc-stream';
import * as types from './eos-types';
import { LogHandler } from './log';
import { OscArgument, OscMessage } from './osc';
import { OscRouter } from './osc-router';
import {
    Channel,
    ChannelPart,
    Cue,
    Patch,
    RecordTargetType,
    RecordTargets,
} from './record-targets';
import * as requests from './request';
import { RequestManager } from './request-manager';
import { TargetNumber, expandTargetNumberArguments } from './target-number';

export type EosConnectionState = 'disconnected' | 'connecting' | 'connected';

export interface EosConsoleOptions {
    /**
     * @default 'localhost'
     */
    host?: string;

    logging?: LogHandler;

    /**
     * @default 3037
     */
    port?: number;
}

export type GetRecordTargetListProgressCallback = (
    complete: number,
    total: number,
) => void;

export class EosConsole extends EventEmitter {
    private _connectionState: EosConnectionState = 'disconnected';
    private log?: LogHandler;
    private requestManager = new RequestManager();
    private router;
    private socket: EosOscStream | null = null;

    private _activeChannels?: readonly TargetNumber[];
    private _activeCue?: types.EosCueIdentifier;
    private _activeWheels?: (types.EosWheel | null)[];
    private _colorHueSat?: types.EosColorHueSat | null;
    private _commandLine?: string;
    private _consoleState?: types.EosState;
    private _focusPanTilt?: types.EosFocusPanTilt | null;
    private _focusXYZ?: types.EosFocusXYZ | null;
    private _locked?: boolean;
    private _pendingCue?: types.EosCueIdentifier | null;
    private _previousCue?: types.EosCueIdentifier | null;
    private _showName?: string;
    private _softKeys?: string[];
    private _version?: string;

    readonly host: string;
    readonly port: number;

    get activeChannels() {
        return this._activeChannels;
    }

    get activeCueNumber() {
        return this._activeCue;
    }

    get activeWheels(): readonly (types.EosWheel | null)[] | undefined {
        return this._activeWheels;
    }

    get colorHueSat() {
        return this._colorHueSat;
    }

    get commandLine() {
        return this._commandLine;
    }

    get connectionState() {
        return this._connectionState;
    }

    get consoleState() {
        return this._consoleState;
    }

    get focusPanTilt() {
        return this._focusPanTilt;
    }

    get focusXYZ() {
        return this._focusXYZ;
    }

    get locked() {
        return this._locked;
    }

    get pendingCueNumber() {
        return this._pendingCue;
    }

    get previousCueNumber() {
        return this._previousCue;
    }

    get showName() {
        return this._showName;
    }

    get softKeys(): readonly string[] | undefined {
        return this._softKeys;
    }

    get version() {
        return this._version;
    }

    constructor(options?: EosConsoleOptions) {
        super();

        this.host = options?.host ?? 'localhost';
        this.port = options?.port ?? 3037;

        if (options?.logging) {
            this.log = options.logging;
        }

        this.router = new OscRouter(this.log);
        this.initRoutes();
    }

    async connect(timeout = 5000) {
        this.log?.(
            'info',
            `Connecting to Eos console at ${this.host}:${this.port}`,
        );

        this._connectionState = 'connecting';
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
                this.log?.('info', 'Eos connection closed');

                this._connectionState = 'disconnected';
                this.emit('disconnect');

                this.socket?.removeAllListeners();
                this.clearState();
            });

            this.socket?.on('error', this.handleOscError.bind(this));
            this.socket?.on('data', this.router.route.bind(this.router));

            this.log?.('info', 'Connected');

            this._connectionState = 'connected';
            this.emit('connect');

            const version = await this.getVersion();
            this.log?.('info', `Eos version ${version}`);

            await this.subscribe();
        };

        this.socket = EosOscStream.connect(this.host, this.port, this.log);
        this.socket.once('error', handleConnectError);
        this.socket.once('ready', handleReady);
    }

    disconnect() {
        this.log?.('info', 'Disconnecting from Eos console');

        this.socket?.destroy();

        this.requestManager.cancelAll(new Error('connection closed'));
    }

    async getVersion(): Promise<string> {
        return this.request(new requests.EosVersionRequest());
    }

    async changeUser(userId: number) {
        await this.sendMessage('/eos/user', [
            new OscArgument(userId, 'integer'),
        ]);
    }

    async executeCommand(
        command: string,
        substitutions: string[] = [],
        newCommand = true,
    ) {
        const address = newCommand ? '/eos/newcmd' : '/eos/cmd';
        await this.sendMessage(address, [command, ...substitutions]);
    }

    async fireCue(cueListNumber: TargetNumber, cueNumber: TargetNumber) {
        await this.sendMessage(`/eos/cue/${cueListNumber}/${cueNumber}/fire`);
    }

    async getCue(cueList: TargetNumber, targetNumber: TargetNumber) {
        return this.request(requests.EosCueRequest.get(targetNumber, cueList));
    }

    async getCues(
        cueList: TargetNumber,
        progressCallback?: GetRecordTargetListProgressCallback,
    ) {
        const total = await this.request(
            new requests.EosRecordTargetCountRequest('cue', cueList),
        );

        if (total === 0) {
            return [];
        }

        let completedCount = 0;

        const cueRequests: Promise<Cue | null>[] = new Array(total);

        for (let i = 0; i < total; i++) {
            cueRequests[i] = this.request(
                requests.EosCueRequest.index(i, cueList),
            ).then(cue => {
                completedCount += 1;
                progressCallback?.(completedCount, total);

                return cue;
            });
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

    async getCueLists(progressCallback?: GetRecordTargetListProgressCallback) {
        return this.getRecordTargetList(
            'cuelist',
            i => requests.EosCueListRequest.index(i),
            progressCallback,
        );
    }

    async getCurve(targetNumber: TargetNumber) {
        return this.request(requests.EosCurveRequest.get(targetNumber));
    }

    async getCurves(progressCallback?: GetRecordTargetListProgressCallback) {
        return this.getRecordTargetList(
            'curve',
            i => requests.EosCurveRequest.index(i),
            progressCallback,
        );
    }

    async getGroup(targetNumber: TargetNumber) {
        return this.request(requests.EosGroupRequest.get(targetNumber));
    }

    async getGroups(progressCallback?: GetRecordTargetListProgressCallback) {
        return this.getRecordTargetList(
            'group',
            i => requests.EosGroupRequest.index(i),
            progressCallback,
        );
    }

    async getEffect(targetNumber: TargetNumber) {
        return this.request(requests.EosEffectRequest.get(targetNumber));
    }

    async getEffects(progressCallback?: GetRecordTargetListProgressCallback) {
        return this.getRecordTargetList(
            'fx',
            i => requests.EosEffectRequest.index(i),
            progressCallback,
        );
    }

    async getMacro(targetNumber: TargetNumber) {
        return this.request(requests.EosMacroRequest.get(targetNumber));
    }

    async getMacros(progressCallback?: GetRecordTargetListProgressCallback) {
        return this.getRecordTargetList(
            'macro',
            i => requests.EosMacroRequest.index(i),
            progressCallback,
        );
    }

    async getMagicSheet(targetNumber: TargetNumber) {
        return this.request(requests.EosMagicSheetRequest.get(targetNumber));
    }

    async getMagicSheets(
        progressCallback?: GetRecordTargetListProgressCallback,
    ) {
        return this.getRecordTargetList(
            'ms',
            i => requests.EosMagicSheetRequest.index(i),
            progressCallback,
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

    async getPatch(progressCallback?: GetRecordTargetListProgressCallback) {
        const patch = await this.getRecordTargetList(
            'patch',
            i => requests.EosPatchRequest.index(i),
            progressCallback,
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

    async getPresets(progressCallback?: GetRecordTargetListProgressCallback) {
        return this.getRecordTargetList(
            'preset',
            i => requests.EosPresetRequest.index(i),
            progressCallback,
        );
    }

    async getIntensityPalette(targetNumber: TargetNumber) {
        return this.request(requests.EosPaletteRequest.get(targetNumber, 'ip'));
    }

    async getIntensityPalettes(
        progressCallback?: GetRecordTargetListProgressCallback,
    ) {
        return this.getRecordTargetList(
            'ip',
            i => requests.EosPaletteRequest.index(i, 'ip'),
            progressCallback,
        );
    }

    async getFocusPalette(targetNumber: TargetNumber) {
        return this.request(requests.EosPaletteRequest.get(targetNumber, 'fp'));
    }

    async getFocusPalettes(
        progressCallback?: GetRecordTargetListProgressCallback,
    ) {
        return this.getRecordTargetList(
            'fp',
            i => requests.EosPaletteRequest.index(i, 'fp'),
            progressCallback,
        );
    }

    async getColorPalette(targetNumber: TargetNumber) {
        return this.request(requests.EosPaletteRequest.get(targetNumber, 'cp'));
    }

    async getColorPalettes(
        progressCallback?: GetRecordTargetListProgressCallback,
    ) {
        return this.getRecordTargetList(
            'cp',
            i => requests.EosPaletteRequest.index(i, 'cp'),
            progressCallback,
        );
    }

    async getBeamPalette(targetNumber: TargetNumber) {
        return this.request(requests.EosPaletteRequest.get(targetNumber, 'bp'));
    }

    async getBeamPalettes(
        progressCallback?: GetRecordTargetListProgressCallback,
    ) {
        return this.getRecordTargetList(
            'bp',
            i => requests.EosPaletteRequest.index(i, 'bp'),
            progressCallback,
        );
    }

    async getPixmap(targetNumber: TargetNumber) {
        return this.request(requests.EosPixelMapRequest.get(targetNumber));
    }

    async getPixmaps(progressCallback?: GetRecordTargetListProgressCallback) {
        return this.getRecordTargetList(
            'pixmap',
            i => requests.EosPixelMapRequest.index(i),
            progressCallback,
        );
    }

    async getSnapshot(targetNumber: TargetNumber) {
        return this.request(requests.EosSnapshotRequest.get(targetNumber));
    }

    async getSnapshots(progressCallback?: GetRecordTargetListProgressCallback) {
        return this.getRecordTargetList(
            'snap',
            i => requests.EosSnapshotRequest.index(i),
            progressCallback,
        );
    }

    async getSub(targetNumber: TargetNumber) {
        return this.request(requests.EosSubRequest.get(targetNumber));
    }

    async getSubs(progressCallback?: GetRecordTargetListProgressCallback) {
        return this.getRecordTargetList(
            'sub',
            i => requests.EosSubRequest.index(i),
            progressCallback,
        );
    }

    async sendMessage(address: string, args: (unknown | OscArgument)[] = []) {
        if (!address.startsWith('/eos/')) {
            throw new Error('message must start with "/eos/"');
        } else if (address.startsWith('/eos/get/')) {
            throw new Error(
                '"/eos/get/" messages can only be sent by the request manager',
            );
        }

        await this.socket?.writeOsc(new OscMessage(address, args));
    }

    private async getRecordTargetList<
        TTargetType extends Exclude<RecordTargetType, 'cue'>,
    >(
        targetType: TTargetType,
        indexRequestFactory: (
            index: number,
        ) => requests.EosRecordTargetRequest<RecordTargets[TTargetType]>,
        progressCallback?: GetRecordTargetListProgressCallback,
    ) {
        const total = await this.request(
            new requests.EosRecordTargetCountRequest(targetType),
        );

        if (total === 0) {
            return [];
        }

        let completedCount = 0;

        const requestPromises: Promise<RecordTargets[TTargetType] | null>[] =
            new Array(total);

        for (let i = 0; i < total; i++) {
            requestPromises[i] = this.request(indexRequestFactory(i)).then(
                recordTarget => {
                    completedCount += 1;
                    progressCallback?.(completedCount, total);

                    return recordTarget;
                },
            );
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
    override emit(eventName: string | symbol, ...args: unknown[]): boolean {
        if (eventName !== 'log') {
            this.log?.(
                'verbose',
                `Event: ${String(eventName)} - ${args
                    .map(a => inspect(a))
                    .join(', ')}`,
            );
        }

        return super.emit(eventName, ...args);
    }

    private clearState() {
        this._activeChannels = undefined;
        this._activeCue = undefined;
        this._activeWheels = undefined;
        this._colorHueSat = undefined;
        this._commandLine = undefined;
        this._consoleState = undefined;
        this._focusPanTilt = undefined;
        this._focusXYZ = undefined;
        this._locked = undefined;
        this._pendingCue = undefined;
        this._previousCue = undefined;
        this._showName = undefined;
        this._softKeys = undefined;
        this._version = undefined;
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
        this.log?.('error', `OSC connection error: ${err.message}`);
    }

    private updateStateFromImplicitOutput(output: EosImplicitOutput) {
        // TODO: we should be able to determine the implicit output type from the
        // route that handled it, making this switch redundant
        switch (output.event) {
            case 'active-channel':
                this._activeChannels = output.channels;
                break;
            case 'active-cue':
                this._activeCue = output.cue;
                break;
            case 'active-wheel':
                this._activeWheels ??= [];
                this._activeWheels[output.index] = output.wheel;
                break;
            case 'cmd':
                this._commandLine = output.commandLine;
                break;
            case 'color-hs':
                this._colorHueSat = output.color;
                break;
            case 'focus-pan-tilt':
                this._focusPanTilt = output.focus;
                break;
            case 'focus-xyz':
                this._focusXYZ = output.focus;
                break;
            case 'locked':
                this._locked = output.locked;
                break;
            case 'pending-cue':
                this._pendingCue = output.cue;
                break;
            case 'previous-cue':
                this._previousCue = output.cue;
                break;
            case 'show-name':
                this._showName = output.showName;
                break;
            case 'soft-key':
                this._softKeys ??= [];
                this._softKeys[output.index] = output.label;
                break;
            case 'state':
                this._consoleState = output.state;
                break;
        }
    }

    private initRoutes() {
        this.log?.('debug', 'Initialising OSC routes');

        for (const [route, handler] of Object.entries(EOS_IMPLICIT_OUTPUT)) {
            this.router.on(route, (message, params) => {
                const implicitOutput = handler(message, params);

                this.updateStateFromImplicitOutput(implicitOutput);

                const { event, ...payload } = implicitOutput;
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
            .on(
                '/eos/*',
                message =>
                    this.log?.(
                        'warn',
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
        await this.sendMessage('/eos/subscribe', [
            new OscArgument(+subscribe, 'integer'),
        ]);
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
