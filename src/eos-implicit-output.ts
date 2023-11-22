import { EosOscMessage } from './eos-osc-stream';
import {
    EosColorHueSat,
    EosFocusPanTilt,
    EosFocusXYZ,
    EosState,
    EosWheelCategory,
} from './eos-types';
import { TargetNumber, expandTargetNumberArguments } from './target-number';

export type EosImplicitOutput =
    | EosCmdOutput
    | EosUserCmdOutput
    | EosShowNameOutput
    | EosActiveCueOutput
    | EosPendingCueOutput
    | EosPreviousCueOutput
    | EosSoftkeyOutput
    | EosUserOutput
    | EosActiveCueTextOutput
    | EosPendingCueTextOutput
    | EosPreviousCueTextOutput
    | EosActiveCuePercentOutput
    | EosStateOutput
    | EosLockedOutput
    | EosColorHueSatOutput
    | EosFocusPanTiltOutput
    | EosFocusXYZOutput
    | EosActiveWheelOutput
    | EosActiveChannelOutput
    | EosShowClearedOutput
    | EosShowLoadedOutput
    | EosShowSavedOutput;

interface EosUserOutput {
    type: 'user';
    userId: number;
}

interface EosCmdOutput {
    type: 'cmd';
    commandLine: string;
}

interface EosUserCmdOutput {
    type: 'user-cmd';
    userId: number;
    commandLine: string;
}

interface EosShowNameOutput {
    type: 'show-name';
    showName: string;
}

interface EosActiveCueOutput {
    type: 'active-cue';
    cueList: TargetNumber;
    cueNumber: TargetNumber;
}

interface EosPendingCueOutput {
    type: 'pending-cue';
    cueList: TargetNumber;
    cueNumber: TargetNumber;
}

interface EosPreviousCueOutput {
    type: 'previous-cue';
    cueList: TargetNumber;
    cueNumber: TargetNumber;
}

interface EosSoftkeyOutput {
    type: 'softkey';
    softkey: number;
    label: string;
}

interface EosActiveCueTextOutput {
    type: 'active-cue-text';
    text: string;
}

interface EosPendingCueTextOutput {
    type: 'pending-cue-text';
    text: string;
}

interface EosPreviousCueTextOutput {
    type: 'previous-cue-text';
    text: string;
}

interface EosActiveCuePercentOutput {
    type: 'active-cue-percent';
    percentComplete: number;
}

interface EosStateOutput {
    type: 'state';
    state: EosState;
}

interface EosLockedOutput {
    type: 'locked';
    locked: boolean;
}

interface EosColorHueSatOutput {
    type: 'color-hs';
    color: EosColorHueSat | null;
}

interface EosFocusPanTiltOutput {
    type: 'focus-pan-tilt';
    focus: EosFocusPanTilt | null;
}

interface EosFocusXYZOutput {
    type: 'focus-xyz';
    focus: EosFocusXYZ | null;
}

interface EosActiveWheelOutput {
    type: 'active-wheel';
    category: EosWheelCategory;
    parameter: string;
    wheelNumber: number;
    value: number;
}

interface EosActiveChannelOutput {
    type: 'active-channel';
    channels: TargetNumber[];
}

interface EosShowClearedOutput {
    type: 'show-cleared';
}

interface EosShowLoadedOutput {
    type: 'show-loaded';
    filePath: string;
}

interface EosShowSavedOutput {
    type: 'show-saved';
    filePath: string;
}

const STATE_LOOKUP: Record<number, EosState> = {
    0: 'blind',
    1: 'live',
};

const WHEEL_CATEGORY_LOOKUP: Record<number, EosWheelCategory> = {
    0: null,
    1: 'intensity',
    2: 'focus',
    3: 'color',
    4: 'image',
    5: 'form',
    6: 'shutter',
};

export const EOS_IMPLICIT_OUTPUT: Record<
    string,
    (
        message: EosOscMessage,
        params: Record<string, string>,
    ) => EosImplicitOutput
> = {
    '/eos/out/color/hs': message => ({
        type: 'color-hs',
        color:
            message.args.length === 2
                ? {
                      hue: Number(message.args[0]),
                      saturation: Number(message.args[1]),
                  }
                : null,
    }),

    '/eos/out/pantilt': message => ({
        type: 'focus-pan-tilt',
        focus:
            message.args.length === 6
                ? {
                      panRange: [
                          Number(message.args[0]),
                          Number(message.args[1]),
                      ],
                      tiltRange: [
                          Number(message.args[2]),
                          Number(message.args[3]),
                      ],
                      pan: Number(message.args[4]),
                      tilt: Number(message.args[5]),
                  }
                : null,
    }),

    '/eos/out/xyz': message => ({
        type: 'focus-xyz',
        focus:
            message.args.length === 3
                ? {
                      x: Number(message.args[0]),
                      y: Number(message.args[1]),
                      z: Number(message.args[2]),
                  }
                : null,
    }),

    '/eos/out/softkey/{softkey}': (message, params) => ({
        type: 'softkey',
        softkey: Number(params.softkey),
        label: message.args[0],
    }),

    //
    // OSC Command Lines
    //
    '/eos/out/cmd': message => ({
        type: 'cmd',
        commandLine: message.args[0],
    }),

    '/eos/out/user/{userId}/cmd': (message, params) => ({
        type: 'user-cmd',
        userId: Number(params.userId),
        commandLine: message.args[0],
    }),

    //
    // OSC Settings
    //
    '/eos/out/user': message => ({
        type: 'user',
        userId: Number(message.args[0]),
    }),

    //
    // OSC Active Channels and Parameters
    //
    '/eos/out/active/chan': message => {
        const rawChannels = message.args[0] as string;
        const i = rawChannels.indexOf(' ');

        const channels = expandTargetNumberArguments(
            rawChannels
                .substring(0, i)
                .split(',')
                .filter(x => x.length),
        );

        return {
            type: 'active-channel',
            channels: channels,
        };
    },

    '/eos/out/active/wheel/{wheelNumber}': (message, params) => {
        // Remove the "current value" text in square brackets
        let parameter = message.args[0] as string;
        const i = parameter.lastIndexOf('[');
        parameter = parameter.substring(0, i).trimEnd();

        return {
            type: 'active-wheel',
            wheelNumber: Number(params.wheelNumber),
            parameter,
            category: WHEEL_CATEGORY_LOOKUP[message.args[1]],
            value: Number(message.args[2]),
        };
    },

    //
    // OSC Cues
    //
    '/eos/out/active/cue/{cueList}/{cueNumber}': (_, params) => ({
        type: 'active-cue',
        cueList: Number(params.cueList),
        cueNumber: Number(params.cueNumber),
    }),

    '/eos/out/active/cue': message => ({
        type: 'active-cue-percent',
        percentComplete: Number(message.args[0]),
    }),

    '/eos/out/active/cue/text': message => ({
        type: 'active-cue-text',
        text: message.args[0],
    }),

    '/eos/out/pending/cue/{cueList}/{cueNumber}': (_, params) => ({
        type: 'pending-cue',
        cueList: Number(params.cueList),
        cueNumber: Number(params.cueNumber),
    }),

    '/eos/out/pending/cue/text': message => ({
        type: 'pending-cue-text',
        text: message.args[0],
    }),

    '/eos/out/previous/cue/{cueList}/{cueNumber}': (_, params) => ({
        type: 'previous-cue',
        cueList: Number(params.cueList),
        cueNumber: Number(params.cueNumber),
    }),

    '/eos/out/previous/cue/text': message => ({
        type: 'previous-cue-text',
        text: message.args[0],
    }),

    //
    // TODO: OSC Direct Select Banks
    //

    //
    // TODO: OSC Fader Banks
    //

    //
    // TODO: OSC Show Control Events
    //

    //
    // OSC Show File Information
    //
    '/eos/out/show/name': message => ({
        type: 'show-name',
        showName: message.args[0],
    }),

    '/eos/out/event/show/loaded': message => ({
        type: 'show-loaded',
        filePath: message.args[0],
    }),

    '/eos/out/event/show/saved': message => ({
        type: 'show-saved',
        filePath: message.args[0],
    }),

    '/eos/out/event/show/cleared': () => ({
        type: 'show-cleared',
    }),

    //
    // OSC Miscellaneous Console Events
    //
    '/eos/out/event/locked': message => ({
        type: 'locked',
        locked: !!message.args[0],
    }),

    '/eos/out/event/state': message => ({
        type: 'state',
        state: STATE_LOOKUP[message.args[0]],
    }),
};
