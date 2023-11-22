import { EosOscMessage } from './eos-osc-stream';
import {
    Cue,
    CueList,
    Curve,
    Effect,
    Group,
    Macro,
    MagicSheet,
    Palette,
    PaletteType,
    Patch,
    PixelMap,
    Preset,
    RecordTarget,
    RecordTargetType,
    Snapshot,
    Sub,
} from './record-targets';
import { TargetNumber, expandTargetNumberArguments } from './target-number';

/**
 * Prepares an `/eos/get/...` OSC request then collects, validates, and parses
 * one or more responses.
 */
export abstract class EosRequest<T> {
    protected static readonly REQUEST_PREFIX = '/eos/get';
    protected static readonly RESPONSE_PREFIX = '/eos/out/get';

    private _error?: Error;
    private _response?: T;

    private oscResponses: EosOscMessage[] = [];

    abstract get outboundMessage(): EosOscMessage;

    constructor(private expectedResponseCount = 1) {}

    protected set response(response: T) {
        this._response = response;
    }

    get response(): T | undefined {
        return this._response;
    }

    protected set error(err: Error) {
        this._error = err;
    }

    get error(): Error | undefined {
        return this._error;
    }

    get isComplete(): boolean {
        return this.response !== undefined;
    }

    collectResponse(msg: EosOscMessage) {
        if (!msg.address.startsWith(EosRequest.RESPONSE_PREFIX)) {
            throw new Error(
                `unexpected response (missing ${EosRequest.RESPONSE_PREFIX}) address prefix)`,
            );
        }

        this.oscResponses.push(msg);

        if (this.oscResponses.length === this.expectedResponseCount) {
            this.response = this.unpack(this.oscResponses);
        }
    }

    protected abstract unpack(messages: EosOscMessage[]): T;
}

export class EosVersionRequest extends EosRequest<string> {
    get outboundMessage(): EosOscMessage {
        return {
            address: '/eos/get/version',
            args: [],
        };
    }

    protected override unpack(messages: EosOscMessage[]): string {
        if (messages[0].address !== '/eos/out/get/version') {
            this.error = new Error(
                'unexpected response for Eos version request',
            );
        }

        return messages[0].args[0];
    }
}

export class EosRecordTargetCountRequest extends EosRequest<number> {
    private outboundAddress: string;
    private responseAddress: string;

    constructor(targetType: 'cue', cueList: number);
    constructor(targetType: Exclude<RecordTargetType, 'cue'>);
    constructor(targetType: RecordTargetType, cueList?: number) {
        super();

        if (targetType === 'cue') {
            if (!cueList) {
                throw new TypeError(`cueList argument is required`);
            }

            this.outboundAddress = `${EosRequest.REQUEST_PREFIX}/cue/${cueList}/noparts/count`;
            this.responseAddress = `${EosRequest.RESPONSE_PREFIX}/cue/${cueList}/noparts/count`;
        } else {
            this.outboundAddress = `${EosRequest.REQUEST_PREFIX}/${targetType}/count`;
            this.responseAddress = `${EosRequest.RESPONSE_PREFIX}/${targetType}/count`;
        }
    }

    get outboundMessage(): EosOscMessage {
        return {
            address: this.outboundAddress,
            args: [],
        };
    }

    protected override unpack(messages: EosOscMessage[]): number {
        if (messages[0].address !== this.responseAddress) {
            this.error = new Error(
                `unexpected response for record target count request: ${this.responseAddress}`,
            );
        }

        return messages[0].args[0];
    }
}

export abstract class EosRecordTargetRequest<
    T extends RecordTarget,
> extends EosRequest<T | null> {
    protected constructor(
        private outboundAddress: string,
        expectedResponseCount?: number,
    ) {
        super(expectedResponseCount);
    }

    get outboundMessage(): EosOscMessage {
        return {
            address: this.outboundAddress,
            args: [],
        };
    }

    override collectResponse(msg: EosOscMessage) {
        if (msg.args[1] === undefined) {
            // UID is missing, so record target does not exist
            this.response = null;
            return;
        }

        super.collectResponse(msg);
    }
}

export class EosCueRequest extends EosRecordTargetRequest<Cue> {
    static index(index: number, cueList: TargetNumber) {
        return new EosCueRequest(
            `/eos/get/cue/${cueList}/noparts/index/${index}`,
            4,
        );
    }

    static get(targetNumber: TargetNumber, cueList: TargetNumber) {
        return new EosCueRequest(
            `/eos/get/cue/${cueList}/${targetNumber}/0`,
            4,
        );
    }

    protected override unpack(messages: EosOscMessage[]): Cue {
        return {
            targetType: 'cue',
            targetNumber: Number(messages[0].address.split('/')[6]),
            ...unpackBaseRecordTarget(messages[0]),
            upTimeDurationMs: messages[0].args[3],
            upTimeDelayMs: messages[0].args[4],
            downTimeDurationMs: nullIfNegative(messages[0].args[5]),
            downTimeDelayMs: nullIfNegative(messages[0].args[6]),
            focusTimeDurationMs: nullIfNegative(messages[0].args[7]),
            focusTimeDelayMs: nullIfNegative(messages[0].args[8]),
            colorTimeDurationMs: nullIfNegative(messages[0].args[9]),
            colorTimeDelayMs: nullIfNegative(messages[0].args[10]),
            beamTimeDurationMs: nullIfNegative(messages[0].args[11]),
            beamTimeDelayMs: nullIfNegative(messages[0].args[12]),
            preheat: messages[0].args[13],
            curve: messages[0].args[14],
            rate: messages[0].args[15],
            mark: messages[0].args[16],
            block: messages[0].args[17],
            assert: messages[0].args[18],
            link: messages[0].args[19],
            followTimeMs: nullIfNegative(messages[0].args[20]),
            hangTimeMs: nullIfNegative(messages[0].args[21]),
            allFade: messages[0].args[22],
            loop: nullIfNegative(messages[0].args[23]),
            solo: messages[0].args[24],
            timecode: messages[0].args[25],
            partCount: messages[0].args[26],
            notes: messages[0].args[27],
            scene: messages[0].args[28],
            sceneEnd: messages[0].args[29],
            cuePartIndex: nullIfNegative(messages[0].args[30]),
            effects: expandTargetNumberArguments(messages[1].args.slice(2)),
            linkedCueLists: expandTargetNumberArguments(
                messages[2].args.slice(2),
            ),
            externalLinkAction: messages[3].args[2] ?? null,
        };
    }
}

export class EosCueListRequest extends EosRecordTargetRequest<CueList> {
    static index(index: number) {
        return new EosCueListRequest(`/eos/get/cuelist/index/${index}`, 2);
    }

    static get(targetNumber: TargetNumber) {
        return new EosCueListRequest(`/eos/get/cuelist/${targetNumber}`, 2);
    }

    protected override unpack(messages: EosOscMessage[]): CueList {
        return {
            targetType: 'cuelist',
            targetNumber: Number(messages[0].address.split('/')[5]),
            ...unpackBaseRecordTarget(messages[0]),
            playbackMode: messages[0].args[3],
            faderMode: messages[0].args[4],
            independent: messages[0].args[5],
            htp: messages[0].args[6],
            assert: messages[0].args[7],
            block: messages[0].args[8],
            background: messages[0].args[9],
            solo: messages[0].args[10],
            timecodeList: nullIfNegative(messages[0].args[11]),
            oosSync: messages[0].args[12],
            linkedCueLists: expandTargetNumberArguments(
                messages[1].args.slice(2),
            ),
        };
    }
}

export class EosCurveRequest extends EosRecordTargetRequest<Curve> {
    static index(index: number) {
        return new EosCurveRequest(`/eos/get/curve/index/${index}`);
    }

    static get(targetNumber: TargetNumber) {
        return new EosCurveRequest(`/eos/get/curve/${targetNumber}`);
    }

    protected override unpack(messages: EosOscMessage[]): Curve {
        return {
            targetType: 'curve',
            targetNumber: Number(messages[0].address.split('/')[5]),
            ...unpackBaseRecordTarget(messages[0]),
        };
    }
}

export class EosEffectRequest extends EosRecordTargetRequest<Effect> {
    static index(index: number) {
        return new EosEffectRequest(`/eos/get/fx/index/${index}`);
    }

    static get(targetNumber: TargetNumber) {
        return new EosEffectRequest(`/eos/get/fx/${targetNumber}`);
    }

    protected override unpack(messages: EosOscMessage[]): Effect {
        return {
            targetType: 'fx',
            targetNumber: Number(messages[0].address.split('/')[5]),
            ...unpackBaseRecordTarget(messages[0]),
            effectType: messages[0].args[3],
            entry: messages[0].args[4],
            exit: messages[0].args[5],
            duration: messages[0].args[6],
            scale: messages[0].args[7],
        };
    }
}

export class EosGroupRequest extends EosRecordTargetRequest<Group> {
    static index(index: number) {
        return new EosGroupRequest(`/eos/get/group/index/${index}`, 2);
    }

    static get(targetNumber: TargetNumber) {
        return new EosGroupRequest(`/eos/get/group/${targetNumber}`, 2);
    }

    protected override unpack(messages: EosOscMessage[]): Group {
        return {
            targetType: 'group',
            targetNumber: Number(messages[0].address.split('/')[5]),
            ...unpackBaseRecordTarget(messages[0]),
            channels: expandTargetNumberArguments(messages[1].args.slice(2)),
        };
    }
}

export class EosMacroRequest extends EosRecordTargetRequest<Macro> {
    static index(index: number) {
        return new EosMacroRequest(`/eos/get/macro/index/${index}`, 2);
    }

    static get(targetNumber: TargetNumber) {
        return new EosMacroRequest(`/eos/get/macro/${targetNumber}`, 2);
    }

    protected override unpack(messages: EosOscMessage[]): Macro {
        return {
            targetType: 'macro',
            targetNumber: Number(messages[0].address.split('/')[5]),
            ...unpackBaseRecordTarget(messages[0]),
            mode: messages[0].args[3],
            command: messages[1].args.slice(2).join(''),
        };
    }
}

export class EosMagicSheetRequest extends EosRecordTargetRequest<MagicSheet> {
    static index(index: number) {
        return new EosMagicSheetRequest(`/eos/get/ms/index/${index}`);
    }

    static get(targetNumber: TargetNumber) {
        return new EosMagicSheetRequest(`/eos/get/ms/${targetNumber}`);
    }

    protected override unpack(messages: EosOscMessage[]): MagicSheet {
        return {
            targetType: 'ms',
            targetNumber: Number(messages[0].address.split('/')[5]),
            ...unpackBaseRecordTarget(messages[0]),
        };
    }
}

export class EosPaletteRequest extends EosRecordTargetRequest<Palette> {
    static index(index: number, paletteType: PaletteType) {
        return new EosPaletteRequest(
            `/eos/get/${paletteType}/index/${index}`,
            3,
        );
    }

    static get(targetNumber: TargetNumber, paletteType: PaletteType) {
        return new EosPaletteRequest(
            `/eos/get/${paletteType}/${targetNumber}`,
            3,
        );
    }

    protected override unpack(messages: EosOscMessage[]): Palette {
        return {
            targetType: messages[0].address.split('/')[4] as PaletteType,
            targetNumber: Number(messages[0].address.split('/')[5]),
            ...unpackBaseRecordTarget(messages[0]),
            absolute: messages[0].args[3],
            locked: messages[0].args[4],
            channels: expandTargetNumberArguments(messages[1].args.slice(2)),
            byTypeChannels: expandTargetNumberArguments(
                messages[2].args.slice(2),
            ),
        };
    }
}

export class EosPatchRequest extends EosRecordTargetRequest<Patch> {
    static index(index: number) {
        return new EosPatchRequest(`/eos/get/patch/index/${index}`, 4);
    }

    static get(
        targetNumber: TargetNumber,
        partNumber: number,
    ): EosPatchRequest {
        return new EosPatchRequest(
            `/eos/get/patch/${targetNumber}/${partNumber}`,
            4,
        );
    }

    protected override unpack(messages: EosOscMessage[]): Patch {
        return {
            targetType: 'patch',
            targetNumber: Number(messages[0].address.split('/')[5]),
            partNumber: Number(messages[0].address.split('/')[6]),
            ...unpackBaseRecordTarget(messages[0]),
            fixtureManufacturer: messages[0].args[3],
            fixtureModel: messages[0].args[4],
            address: messages[0].args[5],
            intensityParameterAddress: messages[0].args[6],
            currentLevel: messages[0].args[7],
            gel: messages[0].args[8],
            text1: messages[0].args[9],
            text2: messages[0].args[10],
            text3: messages[0].args[11],
            text4: messages[0].args[12],
            text5: messages[0].args[13],
            text6: messages[0].args[14],
            text7: messages[0].args[15],
            text8: messages[0].args[16],
            text9: messages[0].args[17],
            text10: messages[0].args[18],
            partCount: messages[0].args[19],
            notes: messages[1].args[2],
        };
    }
}

export class EosPixelMapRequest extends EosRecordTargetRequest<PixelMap> {
    static index(index: number) {
        return new EosPixelMapRequest(`/eos/get/pixmap/index/${index}`, 2);
    }

    static get(targetNumber: TargetNumber) {
        return new EosPixelMapRequest(`/eos/get/pixmap/${targetNumber}`, 2);
    }

    protected override unpack(messages: EosOscMessage[]): PixelMap {
        return {
            targetType: 'pixmap',
            targetNumber: Number(messages[0].address.split('/')[5]),
            ...unpackBaseRecordTarget(messages[0]),
            serverChannel: messages[0].args[3],
            interface: messages[0].args[4],
            width: messages[0].args[5],
            height: messages[0].args[6],
            pixelCount: messages[0].args[7],
            fixtureCount: messages[0].args[8],
            layerChannels: expandTargetNumberArguments(
                messages[1].args.slice(2),
            ),
        };
    }
}

export class EosPresetRequest extends EosRecordTargetRequest<Preset> {
    static index(index: number) {
        return new EosPresetRequest(`/eos/get/preset/index/${index}`, 4);
    }

    static get(targetNumber: TargetNumber) {
        return new EosPresetRequest(`/eos/get/preset/${targetNumber}`, 4);
    }

    protected override unpack(messages: EosOscMessage[]): Preset {
        return {
            targetType: 'preset',
            targetNumber: Number(messages[0].address.split('/')[5]),
            ...unpackBaseRecordTarget(messages[0]),
            absolute: messages[0].args[3],
            locked: messages[0].args[4],
            channels: expandTargetNumberArguments(messages[1].args.slice(2)),
            byTypeChannels: expandTargetNumberArguments(
                messages[2].args.slice(2),
            ),
            effects: expandTargetNumberArguments(messages[3].args.slice(2)),
        };
    }
}

export class EosSnapshotRequest extends EosRecordTargetRequest<Snapshot> {
    static index(index: number) {
        return new EosSnapshotRequest(`/eos/get/snap/index/${index}`);
    }

    static get(targetNumber: TargetNumber) {
        return new EosSnapshotRequest(`/eos/get/snap/${targetNumber}`);
    }

    protected override unpack(messages: EosOscMessage[]): Snapshot {
        return {
            targetType: 'snap',
            targetNumber: Number(messages[0].address.split('/')[5]),
            ...unpackBaseRecordTarget(messages[0]),
        };
    }
}

export class EosSubRequest extends EosRecordTargetRequest<Sub> {
    static index(index: number) {
        return new EosSubRequest(`/eos/get/sub/index/${index}`, 2);
    }

    static get(targetNumber: TargetNumber) {
        return new EosSubRequest(`/eos/get/snap/${targetNumber}`, 2);
    }

    protected override unpack(messages: EosOscMessage[]): Sub {
        return {
            targetType: 'sub',
            targetNumber: Number(messages[0].address.split('/')[5]),
            ...unpackBaseRecordTarget(messages[0]),
            mode: messages[0].args[3],
            faderMode: messages[0].args[4],
            htp: messages[0].args[5],
            exclusive: messages[0].args[6],
            background: messages[0].args[7],
            restore: messages[0].args[8],
            priority: messages[0].args[9],
            upTime: messages[0].args[10],
            dwellTime: messages[0].args[11],
            downTime: messages[0].args[12],
            effects: expandTargetNumberArguments(messages[1].args.slice(2)),
        };
    }
}

function unpackBaseRecordTarget(
    message: EosOscMessage,
): Omit<RecordTarget, 'targetType' | 'targetNumber'> {
    return {
        uid: message.args[1],
        label: message.args[2],
    };
}

function nullIfNegative(x: number): number | null {
    return x >= 0 ? x : null;
}
