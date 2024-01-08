import { EventEmitter } from 'node:events';
import { inspect } from 'node:util';
import { EOS_IMPLICIT_OUTPUT, EosImplicitOutput } from './eos-implicit-output';
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

export class EosConsole extends EventEmitter {
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

    readonly host: string;
    readonly port: number;

    readonly beamPalettes = new modules.PalettesModule(this, 'bp');
    readonly channels = new modules.ChannelsModule(this);
    readonly colorPalettes = new modules.PalettesModule(this, 'cp');
    readonly cueLists = new modules.CueListsModule(this);
    readonly cues = new modules.CuesModule(this);
    readonly curves = new modules.CurvesModule(this);
    readonly effects = new modules.PresetsModule(this);
    readonly focusPalettes = new modules.PalettesModule(this, 'fp');
    readonly groups = new modules.GroupsModule(this);
    readonly intensityPalettes = new modules.PalettesModule(this, 'ip');
    readonly macros = new modules.MacrosModule(this);
    readonly magicSheets = new modules.MagicSheetsModule(this);
    readonly pixelMaps = new modules.PixelMapsModule(this);
    readonly presets = new modules.PresetsModule(this);
    readonly snapshots = new modules.SnapshotsModule(this);
    readonly subs = new modules.SubsModule(this);

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

                this.emit('connectError', err);
                reject(err);
            };

            const handleConnectTimeout = () => {
                this.socket?.destroy();
                this.socket?.off('error', handleConnectError);
                this.socket?.off('ready', handleReady);

                this.emit('connectError', new Error('timed out'));
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

                this.getVersion()
                    .then(version => {
                        this._version = version;
                        this.log?.('info', `Eos version ${version}`);

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

    disconnect() {
        this.log?.('info', 'Disconnecting from Eos console');

        this.socket?.destroy();

        this.requestManager.cancelAll(new Error('connection closed'));
    }

    async getVersion(): Promise<string> {
        return this.request(new requests.VersionRequest());
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

    async sendMessage(address: string, args: unknown[] = []) {
        if (!address.startsWith('/eos/')) {
            throw new Error('message must start with "/eos/"');
        } else if (address.startsWith('/eos/get/')) {
            throw new Error(
                '"/eos/get/" messages can only be sent by the request manager',
            );
        }

        await this.socket?.writeOsc(new OscMessage(address, args));
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
        targetNumberArgs: OscArgument[],
        ...extraArgs: unknown[]
    ) {
        const targetNumbers = targetNumberArgs.flatMap(arg =>
            arg.getTargetNumberRange(),
        );
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

    /**
     * @internal
     */
    async request<T>(request: requests.Request<T>): Promise<T> {
        const response = this.requestManager.register(request);

        await this.socket?.writeOsc(request.outboundMessage);

        return response;
    }
}
