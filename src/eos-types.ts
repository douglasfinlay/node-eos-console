export enum EosState {
    BLIND = 0,
    LIVE = 1,
}

export enum EosWheelCategory {
    UNASSIGNED = 0,
    INTENSITY = 1,
    FOCUS = 2,
    COLOR = 3,
    IMAGE = 4,
    FORM = 5,
    SHUTTER = 6,
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

export interface EosColorHueSat {
    hue: number;
    saturation: number;
}
