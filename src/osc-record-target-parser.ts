import { EosOscMessage } from './eos-osc-stream';
import { Cue, CueList, Group, Macro, RecordTarget } from './record-targets';
import { expandTargetNumberArguments } from './target-number';

export function unpackCue(messages: EosOscMessage[]): Cue {
    return {
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

export function unpackCueList(messages: EosOscMessage[]): CueList {
    return {
        ...unpackBaseRecordTarget(messages[0]),
        cueListNumber: Number(messages[0].address.split('/')[5]),
        playbackMode: messages[0].args[3],
        faderMode: messages[0].args[4],
        independent: messages[0].args[5],
        htp: messages[0].args[6],
        assert: messages[0].args[7],
        block: messages[0].args[8],
        background: messages[0].args[9],
        solo: messages[0].args[10],
        timecodeList: messages[0].args[11] < 0 ? null : messages[0].args[11],
        oosSync: messages[0].args[12],
        linkedCueLists: expandTargetNumberArguments(messages[1].args.slice(2)),
    };
}

export function unpackGroup(messages: EosOscMessage[]): Group {
    return {
        ...unpackBaseRecordTarget(messages[0]),
        groupNumber: messages[0].address.split('/')[5],
        channels: expandTargetNumberArguments(messages[1].args.slice(2)),
    };
}

export function unpackMacro(messages: EosOscMessage[]): Macro {
    return {
        ...unpackBaseRecordTarget(messages[0]),
        macroNumber: messages[0].address.split('/')[4],
        mode: messages[0].args[3],
        command: messages[1].args.slice(2).join(''),
    };
}

function unpackBaseRecordTarget(message: EosOscMessage): RecordTarget {
    return {
        uid: message.args[1],
        label: message.args[2],
    };
}

function nullIfNegative(x: number): number | null {
    return x >= 0 ? x : null;
}
