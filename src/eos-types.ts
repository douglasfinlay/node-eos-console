export type EosState = 'blind' | 'live';

export type EosWheelCategory =
    | null
    | 'intensity'
    | 'focus'
    | 'color'
    | 'image'
    | 'form'
    | 'shutter';

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
