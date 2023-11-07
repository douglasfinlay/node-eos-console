import { EosOscMessage } from './eos-osc-stream';
import {
    EosColorHueSat,
    EosFocusPanTilt,
    EosFocusXYZ,
    EosState,
    EosWheelCategory,
} from './eos-types';
import { expandTargetNumberArguments } from './target-number';

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
    | EosActiveChannelOutput;

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
    cueList: number;
    cueNumber: string;
}

interface EosPendingCueOutput {
    type: 'pending-cue';
    cueList: number;
    cueNumber: string;
}

interface EosPreviousCueOutput {
    type: 'previous-cue';
    cueList: number;
    cueNumber: string;
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
    channels: string[];
}

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
    '/eos/out/event/locked': message => ({
        type: 'locked',
        locked: !!message.args[0],
    }),
    '/eos/out/event/state': message => ({
        type: 'state',
        state: Number(message.args[0]),
    }),
    '/eos/out/active/cue': message => ({
        type: 'active-cue-percent',
        percentComplete: Number(message.args[0]),
    }),
    '/eos/out/active/cue/text': message => ({
        type: 'active-cue-text',
        text: message.args[0],
    }),
    '/eos/out/pending/cue/text': message => ({
        type: 'pending-cue-text',
        text: message.args[0],
    }),
    '/eos/out/previous/cue/text': message => ({
        type: 'previous-cue-text',
        text: message.args[0],
    }),
    '/eos/out/user': message => ({
        type: 'user',
        userId: Number(message.args[0]),
    }),
    '/eos/out/cmd': message => ({
        type: 'cmd',
        commandLine: message.args[0],
    }),
    '/eos/out/user/{userId}/cmd': (message, params) => ({
        type: 'user-cmd',
        userId: Number(params.userId),
        commandLine: message.args[0],
    }),
    '/eos/out/softkey/{softkey}': (message, params) => ({
        type: 'softkey',
        softkey: Number(params.softkey),
        label: message.args[0],
    }),
    '/eos/out/show/name': message => ({
        type: 'show-name',
        showName: message.args[0],
    }),
    '/eos/out/active/cue/{cueList}/{cueNumber}': (_, params) => ({
        type: 'active-cue',
        cueList: Number(params.cueList),
        cueNumber: params.cueNumber,
    }),
    '/eos/out/pending/cue/{cueList}/{cueNumber}': (_, params) => ({
        type: 'pending-cue',
        cueList: Number(params.cueList),
        cueNumber: params.cueNumber,
    }),
    '/eos/out/previous/cue/{cueList}/{cueNumber}': (_, params) => ({
        type: 'previous-cue',
        cueList: Number(params.cueList),
        cueNumber: params.cueNumber,
    }),
    '/eos/out/active/wheel/{wheelNumber}': (message, params) => {
        // Remove the "current value" text in square brackets
        let parameter = message.args[0] as string;
        const i = parameter.lastIndexOf('[');
        parameter = parameter.substring(0, i).trimEnd();

        return {
            type: 'active-wheel',
            wheelNumber: Number(params.wheelNumber),
            parameter,
            category: Number(message.args[1]),
            value: Number(message.args[2]),
        };
    },
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
};
