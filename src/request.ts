import { OscMessage } from './osc';
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

    private oscResponses: OscMessage[] = [];

    abstract get outboundMessage(): OscMessage;

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

    collectResponse(msg: OscMessage) {
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

    protected abstract unpack(messages: OscMessage[]): T;
}

export class EosVersionRequest extends EosRequest<string> {
    get outboundMessage(): OscMessage {
        return new OscMessage('/eos/get/version');
    }

    protected override unpack(messages: OscMessage[]): string {
        if (messages[0].address !== '/eos/out/get/version') {
            this.error = new Error(
                'unexpected response for Eos version request',
            );
        }

        return messages[0].args[0].getString();
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

    get outboundMessage(): OscMessage {
        return new OscMessage(this.outboundAddress);
    }

    protected override unpack(messages: OscMessage[]): number {
        if (messages[0].address !== this.responseAddress) {
            this.error = new Error(
                `unexpected response for record target count request: ${this.responseAddress}`,
            );
        }

        return messages[0].args[0].getInteger();
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

    get outboundMessage(): OscMessage {
        return new OscMessage(this.outboundAddress);
    }

    override collectResponse(msg: OscMessage) {
        if (!msg.args[1]) {
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

    protected override unpack(messages: OscMessage[]): Cue {
        return {
            targetType: 'cue',
            targetNumber: Number(messages[0].address.split('/')[6]),
            ...unpackBaseRecordTarget(messages[0]),
            upTimeDurationMs: messages[0].args[3].getInteger(),
            upTimeDelayMs: messages[0].args[4].getInteger(),
            downTimeDurationMs: messages[0].args[5].getOptionalInteger(),
            downTimeDelayMs: messages[0].args[6].getOptionalInteger(),
            focusTimeDurationMs: messages[0].args[7].getOptionalInteger(),
            focusTimeDelayMs: messages[0].args[8].getOptionalInteger(),
            colorTimeDurationMs: messages[0].args[9].getOptionalInteger(),
            colorTimeDelayMs: messages[0].args[10].getOptionalInteger(),
            beamTimeDurationMs: messages[0].args[11].getOptionalInteger(),
            beamTimeDelayMs: messages[0].args[12].getOptionalInteger(),
            preheat: messages[0].args[13].getBoolean(),
            curve: messages[0].args[14].getTargetNumber(),
            rate: messages[0].args[15].getInteger(),
            mark: messages[0].args[16].getString(),
            block: messages[0].args[17].getString(),
            assert: messages[0].args[18].getString(),
            link: messages[0].args[19].getTargetNumber(),
            followTimeMs: messages[0].args[20].getOptionalInteger(),
            hangTimeMs: messages[0].args[21].getOptionalInteger(),
            allFade: messages[0].args[22].getBoolean(),
            loop: messages[0].args[23].getOptionalInteger(),
            solo: messages[0].args[24].getBoolean(),
            timecode: messages[0].args[25].getString(),
            partCount: messages[0].args[26].getInteger(),
            notes: messages[0].args[27].getString(),
            scene: messages[0].args[28].getString(),
            sceneEnd: messages[0].args[29].getBoolean(),
            cuePartIndex: messages[0].args[30].getOptionalInteger(),
            effects: expandTargetNumberArguments(
                messages[1].args.slice(2).map(arg => arg.value),
            ),
            linkedCueLists: expandTargetNumberArguments(
                messages[2].args.slice(2).map(arg => arg.value),
            ),
            externalLinkAction: messages[3].args[2]?.getString() ?? null,
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

    protected override unpack(messages: OscMessage[]): CueList {
        return {
            targetType: 'cuelist',
            targetNumber: Number(messages[0].address.split('/')[5]),
            ...unpackBaseRecordTarget(messages[0]),
            playbackMode: messages[0].args[3].getString(),
            faderMode: messages[0].args[4].getString(),
            independent: messages[0].args[5].getBoolean(),
            htp: messages[0].args[6].getBoolean(),
            assert: messages[0].args[7].getBoolean(),
            block: messages[0].args[8].getBoolean(),
            background: messages[0].args[9].getBoolean(),
            solo: messages[0].args[10].getBoolean(),
            timecodeList: messages[0].args[11].getOptionalInteger(),
            oosSync: messages[0].args[12].getBoolean(),
            linkedCueLists: expandTargetNumberArguments(
                messages[1].args.slice(2).map(arg => arg.value),
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

    protected override unpack(messages: OscMessage[]): Curve {
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

    protected override unpack(messages: OscMessage[]): Effect {
        return {
            targetType: 'fx',
            targetNumber: Number(messages[0].address.split('/')[5]),
            ...unpackBaseRecordTarget(messages[0]),
            effectType: messages[0].args[3].getString(),
            entry: messages[0].args[4].getString(),
            exit: messages[0].args[5].getString(),
            duration: messages[0].args[6].getString(),
            scale: messages[0].args[7].getInteger(),
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

    protected override unpack(messages: OscMessage[]): Group {
        return {
            targetType: 'group',
            targetNumber: Number(messages[0].address.split('/')[5]),
            ...unpackBaseRecordTarget(messages[0]),
            channels: expandTargetNumberArguments(
                messages[1].args.slice(2).map(arg => arg.value),
            ),
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

    protected override unpack(messages: OscMessage[]): Macro {
        return {
            targetType: 'macro',
            targetNumber: Number(messages[0].address.split('/')[5]),
            ...unpackBaseRecordTarget(messages[0]),
            mode: messages[0].args[3].getString(),
            command: messages[1].args
                .slice(2)
                .map(arg => arg.getString())
                .join(''),
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

    protected override unpack(messages: OscMessage[]): MagicSheet {
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

    protected override unpack(messages: OscMessage[]): Palette {
        return {
            targetType: messages[0].address.split('/')[4] as PaletteType,
            targetNumber: Number(messages[0].address.split('/')[5]),
            ...unpackBaseRecordTarget(messages[0]),
            absolute: messages[0].args[3].getBoolean(),
            locked: messages[0].args[4].getBoolean(),
            channels: expandTargetNumberArguments(
                messages[1].args.slice(2).map(arg => arg.value),
            ),
            byTypeChannels: expandTargetNumberArguments(
                messages[2].args.slice(2).map(arg => arg.value),
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

    protected override unpack(messages: OscMessage[]): Patch {
        return {
            targetType: 'patch',
            targetNumber: Number(messages[0].address.split('/')[5]),
            partNumber: Number(messages[0].address.split('/')[6]),
            ...unpackBaseRecordTarget(messages[0]),
            fixtureManufacturer: messages[0].args[3].getString(),
            fixtureModel: messages[0].args[4].getString(),
            address: messages[0].args[5].getInteger(),
            intensityParameterAddress: messages[0].args[6].getInteger(),
            currentLevel: messages[0].args[7].getInteger(),
            gel: messages[0].args[8].getString(),
            text1: messages[0].args[9].getString(),
            text2: messages[0].args[10].getString(),
            text3: messages[0].args[11].getString(),
            text4: messages[0].args[12].getString(),
            text5: messages[0].args[13].getString(),
            text6: messages[0].args[14].getString(),
            text7: messages[0].args[15].getString(),
            text8: messages[0].args[16].getString(),
            text9: messages[0].args[17].getString(),
            text10: messages[0].args[18].getString(),
            partCount: messages[0].args[19].getInteger(),
            notes: messages[1].args[2].getString(),
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

    protected override unpack(messages: OscMessage[]): PixelMap {
        return {
            targetType: 'pixmap',
            targetNumber: Number(messages[0].address.split('/')[5]),
            ...unpackBaseRecordTarget(messages[0]),
            serverChannel: messages[0].args[3].getInteger(),
            interface: messages[0].args[4].getString(),
            width: messages[0].args[5].getInteger(),
            height: messages[0].args[6].getInteger(),
            pixelCount: messages[0].args[7].getInteger(),
            fixtureCount: messages[0].args[8].getInteger(),
            layerChannels: expandTargetNumberArguments(
                messages[1].args.slice(2).map(arg => arg.value),
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

    protected override unpack(messages: OscMessage[]): Preset {
        return {
            targetType: 'preset',
            targetNumber: Number(messages[0].address.split('/')[5]),
            ...unpackBaseRecordTarget(messages[0]),
            absolute: messages[0].args[3].getBoolean(),
            locked: messages[0].args[4].getBoolean(),
            channels: expandTargetNumberArguments(
                messages[1].args.slice(2).map(arg => arg.value),
            ),
            byTypeChannels: expandTargetNumberArguments(
                messages[2].args.slice(2).map(arg => arg.value),
            ),
            effects: expandTargetNumberArguments(
                messages[3].args.slice(2).map(arg => arg.value),
            ),
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

    protected override unpack(messages: OscMessage[]): Snapshot {
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

    protected override unpack(messages: OscMessage[]): Sub {
        return {
            targetType: 'sub',
            targetNumber: Number(messages[0].address.split('/')[5]),
            ...unpackBaseRecordTarget(messages[0]),
            mode: messages[0].args[3].getString(),
            faderMode: messages[0].args[4].getString(),
            htp: messages[0].args[5].getBoolean(),
            exclusive: messages[0].args[6].getBoolean(),
            background: messages[0].args[7].getBoolean(),
            restore: messages[0].args[8].getBoolean(),
            priority: messages[0].args[9].getString(),
            upTime: messages[0].args[10].getString(),
            dwellTime: messages[0].args[11].getString(),
            downTime: messages[0].args[12].getString(),
            effects: expandTargetNumberArguments(
                messages[1].args.slice(2).map(arg => arg.value),
            ),
        };
    }
}

function unpackBaseRecordTarget(
    message: OscMessage,
): Omit<RecordTarget, 'targetType' | 'targetNumber'> {
    return {
        uid: message.args[1].getString(),
        label: message.args[2].getString(),
    };
}
