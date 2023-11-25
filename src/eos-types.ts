import { TargetNumber } from './target-number';

export interface EosColorHueSat {
    hue: number;
    saturation: number;
}

export interface EosCueIdentifier {
    cueList: TargetNumber;
    cueNumber: TargetNumber;
}

export interface EosFocusPanTilt {
    pan: number;
    panRange: [number, number];
    tilt: number;
    tiltRange: [number, number];
}

export interface EosFocusXYZ {
    x: number;
    y: number;
    z: number;
}

export type EosState = 'blind' | 'live';

export interface EosWheel {
    category: EosWheelCategory;
    parameter: string;
    value: number;
}

export type EosWheelCategory =
    | null
    | 'intensity'
    | 'focus'
    | 'color'
    | 'image'
    | 'form'
    | 'shutter';

export type EosWheelMode = 'coarse' | 'fine';
