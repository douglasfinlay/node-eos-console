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
    Patch,
    PixelMap,
    Preset,
    RecordTarget,
    RecordTargetType,
    Snapshot,
    Sub,
} from './record-targets';
import { expandTargetNumberArguments } from './target-number';

export const OSC_RECORD_TARGET_UNPACK_FN = {
    patch: unpackPatch,
    cuelist: unpackCueList,
    cue: unpackCue,
    group: unpackGroup,
    macro: unpackMacro,
    sub: unpackSub,
    preset: unpackPreset,
    ip: unpackPalette,
    fp: unpackPalette,
    cp: unpackPalette,
    bp: unpackPalette,
    curve: unpackCurve,
    fx: unpackEffect,
    snap: unpackSnapshot,
    pixmap: unpackPixelMap,
    ms: unpackMagicSheet,
    // '3dserver': ,
    // 'fpe': ,
};

export const OSC_RECORD_TARGET_RESPONSE_COUNT: Record<
    RecordTargetType,
    number
> = {
    patch: 2,
    cuelist: 2,
    cue: 4,
    group: 2,
    macro: 2,
    sub: 2,
    preset: 4,
    ip: 3,
    fp: 3,
    cp: 3,
    bp: 3,
    curve: 1,
    fx: 1,
    snap: 1,
    pixmap: 2,
    ms: 1,
    // '3dserver': ,
    // 'fpe': ,
};

function unpackCue(messages: EosOscMessage[]): Cue {
    return {
        targetType: 'cue',
        targetNumber: messages[0].address.split('/')[6],
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
        linkedCueLists: expandTargetNumberArguments(messages[2].args.slice(2)),
        externalLinkAction: messages[3].args[2] ?? null,
    };
}

function unpackCueList(messages: EosOscMessage[]): CueList {
    return {
        targetType: 'cuelist',
        targetNumber: messages[0].address.split('/')[5],
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
        linkedCueLists: expandTargetNumberArguments(messages[1].args.slice(2)),
    };
}

function unpackCurve(messages: EosOscMessage[]): Curve {
    return {
        targetType: 'curve',
        targetNumber: messages[0].address.split('/')[5],
        ...unpackBaseRecordTarget(messages[0]),
    };
}

function unpackEffect(messages: EosOscMessage[]): Effect {
    return {
        targetType: 'fx',
        targetNumber: messages[0].address.split('/')[5],
        ...unpackBaseRecordTarget(messages[0]),
        effectType: messages[0].args[3],
        entry: messages[0].args[4],
        exit: messages[0].args[5],
        duration: messages[0].args[6],
        scale: messages[0].args[7],
    };
}

function unpackGroup(messages: EosOscMessage[]): Group {
    return {
        targetType: 'group',
        targetNumber: messages[0].address.split('/')[5],
        ...unpackBaseRecordTarget(messages[0]),
        channels: expandTargetNumberArguments(messages[1].args.slice(2)),
    };
}

function unpackMacro(messages: EosOscMessage[]): Macro {
    return {
        targetType: 'macro',
        targetNumber: messages[0].address.split('/')[5],
        ...unpackBaseRecordTarget(messages[0]),
        mode: messages[0].args[3],
        command: messages[1].args.slice(2).join(''),
    };
}

function unpackMagicSheet(messages: EosOscMessage[]): MagicSheet {
    return {
        targetType: 'ms',
        targetNumber: messages[0].address.split('/')[5],
        ...unpackBaseRecordTarget(messages[0]),
    };
}

function unpackPalette(messages: EosOscMessage[]): Palette {
    return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        targetType: messages[0].address.split('/')[4] as any,
        targetNumber: messages[0].address.split('/')[5],
        ...unpackBaseRecordTarget(messages[0]),
        absolute: messages[0].args[3],
        locked: messages[0].args[4],
        channels: expandTargetNumberArguments(messages[1].args.slice(2)),
        byTypeChannels: expandTargetNumberArguments(messages[2].args.slice(2)),
    };
}

function unpackPatch(messages: EosOscMessage[]): Patch {
    return {
        targetType: 'patch',
        targetNumber: messages[0].address.split('/')[5],
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

function unpackPixelMap(messages: EosOscMessage[]): PixelMap {
    return {
        targetType: 'pixmap',
        targetNumber: messages[0].address.split('/')[5],
        ...unpackBaseRecordTarget(messages[0]),
        serverChannel: messages[0].args[3],
        interface: messages[0].args[4],
        width: messages[0].args[5],
        height: messages[0].args[6],
        pixelCount: messages[0].args[7],
        fixtureCount: messages[0].args[8],
        layerChannels: expandTargetNumberArguments(messages[1].args.slice(2)),
    };
}

function unpackPreset(messages: EosOscMessage[]): Preset {
    return {
        targetType: 'preset',
        targetNumber: messages[0].address.split('/')[5],
        ...unpackBaseRecordTarget(messages[0]),
        absolute: messages[0].args[3],
        locked: messages[0].args[4],
        channels: expandTargetNumberArguments(messages[1].args.slice(2)),
        byTypeChannels: expandTargetNumberArguments(messages[2].args.slice(2)),
        effects: expandTargetNumberArguments(messages[3].args.slice(2)),
    };
}

function unpackSnapshot(messages: EosOscMessage[]): Snapshot {
    return {
        targetType: 'snap',
        targetNumber: messages[0].address.split('/')[5],
        ...unpackBaseRecordTarget(messages[0]),
    };
}

function unpackSub(messages: EosOscMessage[]): Sub {
    return {
        targetType: 'sub',
        targetNumber: messages[0].address.split('/')[5],
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
