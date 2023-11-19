export interface RecordTargets {
    patch: Patch;
    cuelist: CueList;
    cue: Cue;
    group: Group;
    macro: Macro;
    sub: Sub;
    preset: Preset;
    ip: Palette;
    fp: Palette;
    cp: Palette;
    bp: Palette;
    curve: Curve;
    fx: Effect;
    snap: Snapshot;
    pixmap: PixelMap;
    ms: MagicSheet;
    // '3dserver': ;
    // 'fpe': ;
}

export type RecordTargetType = keyof RecordTargets;

export type PaletteType = Extract<RecordTargetType, 'ip' | 'fp' | 'cp' | 'bp'>;

export type TargetNumber = number;

export interface RecordTarget {
    targetType: RecordTargetType;
    targetNumber: TargetNumber;
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
    effects: TargetNumber[];
    externalLinkAction: string;
    focusTimeDelayMs: number | null;
    focusTimeDurationMs: number | null;
    followTimeMs: number | null;
    hangTimeMs: number | null;
    link: number | string;
    linkedCueLists: TargetNumber[];
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
    faderMode: string;
    htp: boolean;
    independent: boolean;
    linkedCueLists: TargetNumber[];
    oosSync: boolean;
    playbackMode: string;
    solo: boolean;
    timecodeList: number | null;
}

export interface Group extends RecordTarget {
    targetType: 'group';
    channels: TargetNumber[];
}

export interface Macro extends RecordTarget {
    targetType: 'macro';
    command: string;
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
    partNumber: number;
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
    effects: TargetNumber[];
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
    byTypeChannels: TargetNumber[];
    channels: TargetNumber[];
    effects: TargetNumber[];
    locked: boolean;
}

export interface Palette extends RecordTarget {
    targetType: 'ip' | 'fp' | 'cp' | 'bp';
    absolute: boolean;
    byTypeChannels: TargetNumber[];
    channels: TargetNumber[];
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
    layerChannels: TargetNumber[];
    pixelCount: number;
    serverChannel: number;
    width: number;
}

export interface MagicSheet extends RecordTarget {
    targetType: 'ms';
}
