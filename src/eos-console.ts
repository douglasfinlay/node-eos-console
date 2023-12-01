import { EventEmitter } from 'node:events';
import { inspect } from 'node:util';
import { EosOscArg, EosOscStream } from './eos-osc-stream';
import {
    Channel,
    ChannelPart,
    Cue,
    Patch,
    RecordTargetType,
    RecordTargets,
} from './record-targets';
import { RequestManager } from './request-manager';
import { TargetNumber, expandTargetNumberArguments } from './target-number';
import * as requests from './request';
import { OscRouter } from './osc-router';
import { EOS_IMPLICIT_OUTPUT, EosImplicitOutput } from './eos-implicit-output';
import * as types from './eos-types';

export type EosConnectionState = 'disconnected' | 'connecting' | 'connected';

export class EosConsole extends EventEmitter {
    private _connectionState: EosConnectionState = 'disconnected';
    private router = new OscRouter();
    private requestManager = new RequestManager();
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

    constructor(
        public readonly host: string,
        public readonly port = 3037,
    ) {
        super();

        this.initRoutes();
    }

    async connect(timeout = 5000) {
        console.log(`Connecting to EOS console at ${this.host}:${this.port}`);

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
                console.log('EOS connection closed');

                this._connectionState = 'disconnected';
                this.emit('disconnect');

                this.socket?.removeAllListeners();
                this.clearState();
            });

            this.socket?.on('error', this.handleOscError.bind(this));
            this.socket?.on('data', this.router.route.bind(this.router));

            console.log('Connected');

            this._connectionState = 'connected';
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
        await this.sendMessage('/eos/user', [userId]);
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

    async sendMessage(address: string, args: EosOscArg[] = []) {
        if (!address.startsWith('/eos/')) {
            throw new Error('message must start with "/eos/"');
        } else if (address.startsWith('/eos/get/')) {
            throw new Error(
                '"/eos/get/" messages can only be sent by the request manager',
            );
        }

        await this.socket?.writeOsc({ address, args });
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
    override emit(eventName: string | symbol, ...args: unknown[]): boolean {
        console.log(
            `Event: ${String(eventName)} - ${args
                .map(a => inspect(a))
                .join(', ')}`,
        );

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
        console.error('OSC connection error:', err);
    }

    private updateStateFromImplicitOutput(output: EosImplicitOutput) {
        // TODO: we should be able to determine the implicit output type from the
        // route that handled it, making this switch redundant
        switch (output.type) {
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
        for (const [route, handler] of Object.entries(EOS_IMPLICIT_OUTPUT)) {
            this.router.on(route, (message, params) => {
                const implicitOutput = handler(message, params);

                this.updateStateFromImplicitOutput(implicitOutput);

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
        await this.sendMessage('/eos/subscribe', [
            {
                type: 'integer',
                value: +subscribe,
            },
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
