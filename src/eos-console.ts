import { EventEmitter } from 'eventemitter3';
import { inspect } from 'node:util';
import {
    EOS_IMPLICIT_OUTPUT,
    EosImplicitOutput,
    ImplicitOutputEvents,
} from './eos-implicit-output';
import { EosOscStream } from './eos-osc-stream';
import * as types from './eos-types';
import { TargetNumber } from './eos-types';
import { LogHandler } from './log';
import * as modules from './modules';
import { OscArgument, OscMessage } from './osc';
import { OscRouter } from './osc-router';
import { RecordTargetType } from './record-targets';
import { RequestManager } from './request-manager';
import * as requests from './requests';

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

/**
 * Manages a connection to an ETC Eos-family lighting console.
 *
 *
 * ### Modules
 *
 * Each property named after a record target (e.g. `cues`, `groups`, `macros`)
 * exposes a module for interacting with that target type.
 *
 *
 * ### Connection Events
 *
 * | Name         | Description                                     |
 * |--------------|-------------------------------------------------|
 * | `connect`    | Emitted when the console successfully connects. |
 * | `connecting` | Emitted when a connection attempt begins.       |
 * | `disconnect` | Emitted when the connection is closed or lost.  |
 *
 *
 * ### Console Events
 *
 * | Name                   | Description                                     | Parameters                                                                 |
 * |------------------------|-------------------------------------------------|----------------------------------------------------------------------------|
 * | `active-channel`       | Active channel selection has changed.           | `channels: TargetNumber[]`                                                 |
 * | `active-cue`           | Active cue has changed.                         | `cue: EosCueIdentifier`                                                    |
 * | `active-wheel`         | Encoder wheel has changed.                      | `index: number`, `wheel: EosWheel \| null`                                 |
 * | `cmd`                  | Command line has changed.                       | `commandLine: string`                                                      |
 * | `color-hs`             | Hue/saturation color has changed.               | `color: EosColorHueSat`                                                    |
 * | `focus-pan-tilt`       | Pan/tilt focus has changed.                     | `focus: EosFocusPanTilt`                                                   |
 * | `focus-xyz`            | XYZ focus has changed.                          | `focus: EosFocusXYZ`                                                       |
 * | `locked`               | Console lock state has changed.                 | `locked: boolean`                                                          |
 * | `osc`                  | Unhandled OSC message received.                 | `message: OscMessage`                                                      |
 * | `pending-cue`          | Pending cue has changed.                        | `cue: EosCueIdentifier`                                                    |
 * | `previous-cue`         | Previous cue has changed.                       | `cue: EosCueIdentifier`                                                    |
 * | `record-target-change` | A record target (e.g., cue, group) has changed. | `targetType: RecordTargetType`, `targetNumbers: TargetNumber[]`, `extraArgs: unknown[]` |
 * | `show-name`            | Loaded show name has changed.                   | `showName: string`                                                         |
 * | `soft-key`             | Soft key label has changed.                     | `index: number`, `label: string`                                           |
 * | `state`                | Full console state has been updated.            | `state: EosState`                                                          |
 *
 */
export class EosConsole extends EventEmitter<EosConsoleEvents> {
    /**
     * @category Connection
     */
    readonly host: string;
    /**
     * @category Connection
     */
    readonly port: number;

    /**
     * Provides access to beam palettes.
     * @category Record Targets
     */
    readonly beamPalettes = new modules.PalettesModule('bp');
    /**
     * Provides access to color palettes.
     * @category Record Targets
     */
    readonly colorPalettes = new modules.PalettesModule('cp');
    /**
     * Provides access to cue list banks.
     * @category Record Target Banks
     */
    readonly cueListBanks = new modules.CueListBanksModule();
    /**
     * Provides access to cue lists.
     * @category Record Targets
     */
    readonly cueLists = new modules.CueListsModule();
    /**
     * Provides access to cues.
     * @category Record Targets
     */
    readonly cues = new modules.CuesModule();
    /**
     * Provides access to curves.
     * @category Record Targets
     */
    readonly curves = new modules.CurvesModule();
    /**
     * Provides access to direct selects banks.
     * @category Record Target Banks
     */
    readonly directSelectsBanks = new modules.DirectSelectsBanksModule();
    /**
     * Provides access to effects.
     * @category Record Targets
     */
    readonly effects = new modules.EffectsModule();
    /**
     * Provides access to fader banks.
     * @category Record Target Banks
     */
    readonly faderBanks = new modules.FaderBanksModule();
    /**
     * Provides access to focus palettes.
     * @category Record Targets
     */
    readonly focusPalettes = new modules.PalettesModule('fp');
    /**
     * Provides access to groups.
     * @category Record Targets
     */
    readonly groups = new modules.GroupsModule();
    /**
     * Provides access to intensity palettes.
     * @category Record Targets
     */
    readonly intensityPalettes = new modules.PalettesModule('ip');
    /**
     * Provides access to macros.
     * @category Record Targets
     */
    readonly macros = new modules.MacrosModule();
    /**
     * Provides access to magic sheets.
     * @category Record Targets
     */
    readonly magicSheets = new modules.MagicSheetsModule();
    /**
     * Provides access to the patch (channels).
     * @category Record Targets
     */
    readonly patch = new modules.ChannelsModule();
    /**
     * Provides access to pixel maps.
     * @category Record Targets
     */
    readonly pixelMaps = new modules.PixelMapsModule();
    /**
     * Provides access to presets.
     * @category Record Targets
     */
    readonly presets = new modules.PresetsModule();
    /**
     * Provides access to snapshots.
     * @category Record Targets
     */
    readonly snapshots = new modules.SnapshotsModule();
    /**
     * Provides access to submasters.
     * @category Record Targets
     */
    readonly subs = new modules.SubsModule();

    private readonly allModules = [
        this.beamPalettes,
        this.colorPalettes,
        this.cueListBanks,
        this.cueLists,
        this.cues,
        this.curves,
        this.directSelectsBanks,
        this.effects,
        this.faderBanks,
        this.focusPalettes,
        this.groups,
        this.intensityPalettes,
        this.macros,
        this.magicSheets,
        this.patch,
        this.pixelMaps,
        this.presets,
        this.snapshots,
        this.subs,
    ];

    private _connectionState: EosConnectionState = 'disconnected';
    private log?: LogHandler;
    private requestManager = new RequestManager();
    private router: OscRouter;
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

    /**
     * @category Console State
     * @remarks `undefined` unless connected to a console.
     */
    get activeChannels() {
        return this._activeChannels;
    }

    /**
     * @category Console State
     * @remarks `undefined` unless connected to a console.
     */
    get activeCueNumber() {
        return this._activeCue;
    }

    /**
     * @category Console State
     * @remarks `undefined` unless connected to a console.
     */
    get activeWheels(): readonly (types.EosWheel | null)[] | undefined {
        return this._activeWheels;
    }

    /**
     * @category Console State
     * @remarks `undefined` unless connected to a console.
     */
    get colorHueSat() {
        return this._colorHueSat;
    }

    /**
     * @category Console State
     * @remarks `undefined` unless connected to a console.
     */
    get commandLine() {
        return this._commandLine;
    }

    /**
     * @category Console State
     * @remarks `undefined` unless connected to a console.
     */
    get connectionState() {
        return this._connectionState;
    }

    /**
     * @category Console State
     * @remarks `undefined` unless connected to a console.
     */
    get consoleState() {
        return this._consoleState;
    }

    /**
     * @category Console State
     * @remarks `undefined` unless connected to a console.
     */
    get focusPanTilt() {
        return this._focusPanTilt;
    }

    /**
     * @category Console State
     * @remarks `undefined` unless connected to a console.
     */
    get focusXYZ() {
        return this._focusXYZ;
    }

    /**
     * @category Console State
     * @remarks `undefined` unless connected to a console.
     */
    get locked() {
        return this._locked;
    }

    /**
     * @category Console State
     * @remarks `undefined` unless connected to a console.
     */
    get pendingCueNumber() {
        return this._pendingCue;
    }

    /**
     * @category Console State
     * @remarks `undefined` unless connected to a console.
     */
    get previousCueNumber() {
        return this._previousCue;
    }

    /**
     * @category Console State
     * @remarks `undefined` unless connected to a console.
     */
    get showName() {
        return this._showName;
    }

    /**
     * @category Console State
     * @remarks `undefined` unless connected to a console.
     */
    get softKeys(): readonly string[] | undefined {
        return this._softKeys;
    }

    /**
     * @category Console State
     * @remarks `undefined` unless connected to a console.
     */
    get version() {
        return this._version;
    }

    /**
     * @todo
     */
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

    /**
     * Establises a TCP connection to the Eos-family console using OSC 1.1.
     *
     * @param timeout The time (in milliseconds) to wait before failing the
     * connection attempt. Defaults to 5000.
     * @returns A promise that resolves when the connection is successfully
     * established.
     *
     * @remarks
     * Emits the `connecting` and `connect` events.
     * Rejects if the connection fails or times out.
     *
     * @category Connection
     */
    connect(timeout = 5000) {
        this.log?.(
            'info',
            `Connecting to Eos console at ${this.host}:${this.port}`,
        );

        this._connectionState = 'connecting';
        this.emit('connecting');

        return new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => {
                handleConnectTimeout();
            }, timeout);

            const handleConnectError = (err: Error) => {
                clearTimeout(timer);
                this.socket?.off('ready', handleReady);

                reject(err);
            };

            const handleConnectTimeout = () => {
                this.socket?.destroy();
                this.socket?.off('error', handleConnectError);
                this.socket?.off('ready', handleReady);

                reject(new Error('timed out'));
            };

            const handleReady = () => {
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

                this.requestVersion()
                    .then(version => {
                        this._version = version;
                        this.log?.('info', `Eos version ${version}`);

                        this.initModules(version);

                        return this.subscribe();
                    })
                    .then(resolve)
                    .catch(err => {
                        reject(err);
                    });
            };

            this.socket = EosOscStream.connect(this.host, this.port, this.log);

            this.socket.once('error', handleConnectError);
            this.socket.once('ready', handleReady);
        });
    }

    /**
     * Disconnects from the console.
     *
     * @remarks
     * Emits the `disconnect` event.
     * Cancels all pending requests, destroys the underlying TCP socket, and
     * clears cached state.
     *
     * @category Connection
     */
    disconnect() {
        this.log?.('info', 'Disconnecting from Eos console');

        this.socket?.destroy();

        this.requestManager.cancelAll(new Error('connection closed'));
    }

    /**
     * Changes the console user for the current connection.
     *
     * @param userId the user ID to switch to.
     *
     * @category Connection
     */
    async changeUser(userId: number) {
        await this.sendMessage('/eos/user', [
            new OscArgument(userId, 'integer'),
        ]);
    }

    /**
     * Sends a command line instruction on the console. Substitutions may be
     * used with numeric placeholders denoted by % (%1, %2, etc).
     *
     * @param command the command line text including placeholders if required.
     * @param substitutions values to be substitued into numeric placeholders.
     * @param newCommand if `true`, reset the command line first.
     *
     * @category Commands
     */
    async executeCommand(
        command: string,
        substitutions: string[] = [],
        newCommand = true,
    ) {
        const address = newCommand ? '/eos/newcmd' : '/eos/cmd';
        await this.sendMessage(address, [command, ...substitutions]);
    }

    /**
     * Sends an arbitrary OSC message to the Eos console. The address pattern
     * must begin with `/eos/`.
     *
     * @remarks
     * Requests (address patterns beginning with `/eos/get/`) will be rejected
     * as these must be handled by the request system for state to properly be
     * tracked.
     *
     * @param address the OSC address pattern.
     * @param args positional arguments.
     *
     * @category Connection
     */
    async sendMessage(address: string, args: unknown[] = []) {
        if (!address.startsWith('/eos/')) {
            throw new Error('message must start with "/eos/"');
        } else if (address.startsWith('/eos/get/')) {
            throw new Error(
                '"/eos/get/" messages can only be sent by the request manager',
            );
        }

        await this.getSocket().writeOsc(new OscMessage(address, args));
    }

    /**
     * @internal
     */
    override emit<T extends EosConsoleEventNames>(
        event: T,
        ...args: EventEmitter.ArgumentMap<EosConsoleEvents>[Extract<
            T,
            EosConsoleEventNames
        >]
    ): boolean {
        this.log?.(
            'verbose',
            `Event: ${String(event)} - ${args.map(a => inspect(a)).join(', ')}`,
        );

        return super.emit(event, ...args);
    }

    private clearState() {
        this.destroyModules();

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
        targetNumberArgs: OscArgument[],
        ...extraArgs: unknown[]
    ) {
        const targetNumbers = targetNumberArgs.flatMap(arg =>
            arg.getTargetNumberRange(),
        );
        this.emit('record-target-change', targetType, targetNumbers, extraArgs);
    }

    private async requestVersion(): Promise<string> {
        return this.request(new requests.VersionRequest());
    }

    private getSocket() {
        if (!this.socket || this.connectionState !== 'connected') {
            throw new Error('not connected to Eos');
        }

        return this.socket;
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

    private initModules(eosVersion: string) {
        const moduleContext: modules.EosConsoleModuleContext = {
            version: eosVersion,
            request: this.request.bind(this),
            sendMessage: this.sendMessage.bind(this),
        };

        for (const module of this.allModules) {
            module.init(moduleContext);
        }
    }

    private destroyModules() {
        for (const module of this.allModules) {
            module.destroy();
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
            .on('/eos/out/get/*', message => {
                this.requestManager.handleResponse(message);
            })
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
                        `Unhandled OSC message: ${message.toString()}`,
                    ),
            )
            .on('/*', message => this.emit('osc', message));
    }

    private async subscribe(subscribe = true) {
        await this.sendMessage('/eos/subscribe', [
            new OscArgument(+subscribe, 'integer'),
        ]);
    }

    private async request<T>(request: requests.Request<T>): Promise<T> {
        const response = this.requestManager.register(request);

        await this.getSocket().writeOsc(request.outboundMessage);

        return response;
    }
}

type EosConsoleEvents = {
    connect: () => void;
    connecting: () => void;
    disconnect: () => void;
    'record-target-change': (
        targetType: RecordTargetType,
        targetNumbers: TargetNumber[],
        extraArgs: unknown[],
    ) => void;
    osc: (message: OscMessage) => void;
} & ImplicitOutputEvents;

type EosConsoleEventNames = keyof EosConsoleEvents;
