export type RecordTargetType =
    | 'patch'
    | 'cuelist'
    | 'cue'
    | 'group'
    | 'macro'
    | 'sub'
    | 'preset'
    | 'ip'
    | 'fp'
    | 'cp'
    | 'bp'
    | 'curve'
    | 'fx'
    | 'snap'
    | 'pixmap'
    | 'ms'
    | '3dserver'
    | 'fpe';

export interface RecordTarget {
    label: string;
    uid: string;
}

export interface Cue extends RecordTarget {
    allFade: boolean;
    assert: string;
    beamTimeDelayMs: number | null;
    beamTimeDurationMs: number | null;
    block: string;
    colorTimeDelayMs: number | null;
    colorTimeDurationMs: number | null;
    cuePartIndex: number | null;
    curve: string;
    downTimeDelayMs: number | null;
    downTimeDurationMs: number | null;
    effects: string[];
    externalLinkAction: string;
    focusTimeDelayMs: number | null;
    focusTimeDurationMs: number | null;
    followTimeMs: number | null;
    hangTimeMs: number | null;
    link: number | string;
    linkedCueLists: string[];
    loop: number | null;
    mark: string;
    notes: string;
    partCount: number;
    preheat: boolean;
    rate: number;
    scene: string;
    sceneEnd: boolean;
    solo: boolean;
    timecode: string;
    upTimeDelayMs: number;
    upTimeDurationMs: number;
}

export interface CueList extends RecordTarget {
    assert: boolean;
    background: boolean;
    block: boolean;
    faderMode: string;
    htp: boolean;
    independent: boolean;
    linkedCueLists: string[];
    oosSync: boolean;
    playbackMode: string;
    solo: boolean;
    timecodeList: number | null;
}

export interface Group extends RecordTarget {
    channels: string[];
    groupNumber: string;
}

export interface Macro extends RecordTarget {
    command: string;
    macroNumber: string;
    mode: string;
}
