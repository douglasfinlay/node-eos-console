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
    targetType: RecordTargetType;
    label: string;
    uid: string;
}

export interface Cue extends RecordTarget {
    targetType: 'cue';
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
    targetType: 'cuelist';
    assert: boolean;
    background: boolean;
    block: boolean;
    cueListNumber: number;
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
    targetType: 'group';
    channels: string[];
    groupNumber: string;
}

export interface Macro extends RecordTarget {
    targetType: 'macro';
    command: string;
    macroNumber: string;
    mode: string;
}

export interface Patch extends RecordTarget {
    targetType: 'patch';
    address: number;
    currentLevel: number;
    fixtureManufacturer: string;
    fixtureModel: string;
    gel: string;
    intensityParameterAddress: number;
    notes: string;
    partCount: number;
    text10: string;
    text1: string;
    text2: string;
    text3: string;
    text4: string;
    text5: string;
    text6: string;
    text7: string;
    text8: string;
    text9: string;
}

export interface Sub extends RecordTarget {
    targetType: 'sub';
    background: boolean;
    downTime: string;
    dwellTime: string;
    effects: string[];
    exclusive: boolean;
    faderMode: string;
    htp: boolean;
    mode: string;
    priority: string;
    restore: boolean;
    upTime: string;
}

export interface Preset extends RecordTarget {
    targetType: 'preset';
    absolute: boolean;
    byTypeChannels: string[];
    channels: string[];
    effects: string[];
    locked: boolean;
}

export interface Palette extends RecordTarget {
    targetType: 'ip' | 'fp' | 'cp' | 'bp';
    absolute: boolean;
    byTypeChannels: string[];
    channels: string[];
    locked: boolean;
}

export interface Curve extends RecordTarget {
    targetType: 'curve';
}

export interface Effect extends RecordTarget {
    targetType: 'fx';
    duration: string;
    effectType: string;
    entry: string;
    exit: string;
    scale: number;
}

export interface Snapshot extends RecordTarget {
    targetType: 'snap';
}

export interface PixelMap extends RecordTarget {
    targetType: 'pixmap';
    fixtureCount: number;
    height: number;
    interface: string;
    layerChannels: string[];
    pixelCount: number;
    serverChannel: number;
    width: number;
}

export interface MagicSheet extends RecordTarget {
    targetType: 'ms';
}
