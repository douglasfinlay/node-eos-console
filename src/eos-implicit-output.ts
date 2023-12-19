import {
    EosColorHueSat,
    EosCueIdentifier,
    EosFocusPanTilt,
    EosFocusXYZ,
    EosState,
    EosWheel,
    EosWheelCategory,
    EosWheelMode,
} from './eos-types';
import { OscMessage } from './osc';
import { TargetNumber, expandTargetNumberArguments } from './target-number';

export type EosImplicitOutput =
    | EosCmdOutput
    | EosUserCmdOutput
    | EosShowNameOutput
    | EosCueOutput
    | EosNullableCueOutput
    | EosSoftKeyOutput
    | EosUserOutput
    | EosCueTextOutput
    | EosActiveCuePercentOutput
    | EosStateOutput
    | EosLockedOutput
    | EosColorHueSatOutput
    | EosFocusPanTiltOutput
    | EosFocusXYZOutput
    | EosActiveWheelOutput
    | EosActiveChannelOutput
    | EosShowClearedOutput
    | EosShowFilePathOutput
    | EosCuePlaybackEvent
    | EosWheelModeOutput
    | EosMacroEvent
    | EosSubEvent
    | EosRelayEvent;

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

interface EosCueOutput {
    type: 'active-cue';
    cue: EosCueIdentifier;
}

interface EosNullableCueOutput {
    type: 'pending-cue' | 'previous-cue';
    cue: EosCueIdentifier | null;
}

interface EosSoftKeyOutput {
    type: 'soft-key';
    index: number;
    label: string;
}

interface EosCueTextOutput {
    type: 'active-cue-text' | 'pending-cue-text' | 'previous-cue-text';
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
    index: number;
    wheel: EosWheel | null;
}

interface EosActiveChannelOutput {
    type: 'active-channel';
    channels: TargetNumber[];
}

interface EosShowClearedOutput {
    type: 'show-cleared';
}

interface EosShowFilePathOutput {
    type: 'show-loaded' | 'show-saved';
    filePath: string;
}

interface EosCuePlaybackEvent {
    type: 'cue-fired' | 'cue-stopped';
    cue: EosCueIdentifier;
    label: string;
}

interface EosWheelModeOutput {
    type: 'wheel-mode' | 'switch-mode';
    mode: EosWheelMode;
}

interface EosMacroEvent {
    type: 'macro-fired';
    macro: TargetNumber;
}

interface EosSubEvent {
    type: 'sub-bumped';
    sub: TargetNumber;
    bump: boolean;
}

interface EosRelayEvent {
    type: 'relay-state';
    group: number;
    relay: number;
    active: boolean;
}

const STATE_LOOKUP: Record<number, EosState> = {
    0: 'blind',
    1: 'live',
};

const WHEEL_CATEGORY_LOOKUP: Record<number, EosWheelCategory> = {
    1: 'intensity',
    2: 'focus',
    3: 'color',
    4: 'image',
    5: 'form',
    6: 'shutter',
};

const WHEEL_MODE_LOOKUP: Record<number, EosWheelMode> = {
    0: 'coarse',
    1: 'fine',
};

type ImplicitOutputHandler = (
    message: OscMessage,
    params: Record<string, string>,
) => EosImplicitOutput;

type ImplicitOutput = Record<string, ImplicitOutputHandler>;

export const EOS_IMPLICIT_OUTPUT: ImplicitOutput = {
    '/eos/out/color/hs': message => ({
        type: 'color-hs',
        color:
            message.args.length === 2
                ? {
                      hue: message.args[0].getFloat(),
                      saturation: message.args[1].getFloat(),
                  }
                : null,
    }),

    '/eos/out/pantilt': message => ({
        type: 'focus-pan-tilt',
        focus:
            message.args.length === 6
                ? {
                      panRange: [
                          message.args[0].getFloat(),
                          message.args[1].getFloat(),
                      ],
                      tiltRange: [
                          message.args[2].getFloat(),
                          message.args[3].getFloat(),
                      ],
                      pan: message.args[4].getFloat(),
                      tilt: message.args[5].getFloat(),
                  }
                : null,
    }),

    '/eos/out/xyz': message => ({
        type: 'focus-xyz',
        focus:
            message.args.length === 3
                ? {
                      x: message.args[0].getFloat(),
                      y: message.args[1].getFloat(),
                      z: message.args[2].getFloat(),
                  }
                : null,
    }),

    '/eos/out/softkey/{softkey}': (message, params) => ({
        type: 'soft-key',
        index: Number(params.softkey) - 1,
        label: message.args[0].getString(),
    }),

    //
    // OSC Command Lines
    //
    '/eos/out/cmd': message => ({
        type: 'cmd',
        commandLine: message.args[0].getString(),
    }),

    '/eos/out/user/{userId}/cmd': (message, params) => ({
        type: 'user-cmd',
        userId: Number(params.userId),
        commandLine: message.args[0].getString(),
    }),

    //
    // OSC Settings
    //
    '/eos/out/switch': message => ({
        type: 'switch-mode',
        mode: WHEEL_MODE_LOOKUP[message.args[0].getInteger()],
    }),

    '/eos/out/user': message => ({
        type: 'user',
        userId: message.args[0].getInteger(),
    }),

    '/eos/out/wheel': message => ({
        type: 'wheel-mode',
        mode: WHEEL_MODE_LOOKUP[message.args[0].getInteger()],
    }),

    //
    // OSC Active Channels and Parameters
    //
    '/eos/out/active/chan': message => {
        const rawChannels = message.args[0].getString();
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
        let wheel: EosWheel | null = null;

        // Only parse the wheel if it has a non-zero category
        if (message.args[1]) {
            // Remove the "current value" text in square brackets
            let parameter = message.args[0].getString();
            const i = parameter.lastIndexOf('[');
            parameter = parameter.substring(0, i).trimEnd();

            wheel = {
                category: WHEEL_CATEGORY_LOOKUP[message.args[1].getInteger()],
                parameter,
                value: message.args[2].getFloat(),
            };
        }

        return {
            type: 'active-wheel',
            index: Number(params.wheelNumber) - 1,
            wheel,
        };
    },

    //
    // OSC Cues
    //
    '/eos/out/active/cue/{cueList}/{cueNumber}': (_, params) => ({
        type: 'active-cue',
        cue: {
            cueList: Number(params.cueList),
            cueNumber: Number(params.cueNumber),
        },
    }),

    '/eos/out/active/cue': message => ({
        type: 'active-cue-percent',
        percentComplete: message.args[0].getInteger(),
    }),

    '/eos/out/active/cue/text': message => ({
        type: 'active-cue-text',
        text: message.args[0].getString(),
    }),

    '/eos/out/pending/cue': () => ({
        type: 'pending-cue',
        cue: null,
    }),

    '/eos/out/pending/cue/{cueList}/{cueNumber}': (_, params) => ({
        type: 'pending-cue',
        cue: {
            cueList: Number(params.cueList),
            cueNumber: Number(params.cueNumber),
        },
    }),

    '/eos/out/pending/cue/text': message => ({
        type: 'pending-cue-text',
        text: message.args[0].getString(),
    }),

    '/eos/out/previous/cue': () => ({
        type: 'previous-cue',
        cue: null,
    }),

    '/eos/out/previous/cue/{cueList}/{cueNumber}': (_, params) => ({
        type: 'previous-cue',
        cue: {
            cueList: Number(params.cueList),
            cueNumber: Number(params.cueNumber),
        },
    }),

    '/eos/out/previous/cue/text': message => ({
        type: 'previous-cue-text',
        text: message.args[0].getString(),
    }),

    //
    // TODO: OSC Direct Select Banks
    //

    //
    // TODO: OSC Fader Banks
    //

    //
    // OSC Show Control Events
    //
    '/eos/out/event/cue/{cueList}/{cueNumber}/fire': (message, params) => ({
        type: 'cue-fired',
        cue: {
            cueList: Number(params.cueList),
            cueNumber: Number(params.cueNumber),
        },
        label: message.args[0].getString(),
    }),

    '/eos/out/event/cue/{cueList}/{cueNumber}/stop': (message, params) => ({
        type: 'cue-stopped',
        cue: {
            cueList: Number(params.cueList),
            cueNumber: Number(params.cueNumber),
        },
        label: message.args[0].getString(),
    }),

    '/eos/out/event/macro/{macroNumber}': (_, params) => ({
        type: 'macro-fired',
        macro: Number(params.macroNumber),
    }),

    '/eos/out/event/relay/{relayNumber}/{groupNumber}': (message, params) => ({
        type: 'relay-state',
        active: !!message.args[0],
        group: Number(params.groupNumber),
        relay: Number(params.relayNumber),
    }),

    '/eos/out/event/sub/{subNumber}': (message, params) => ({
        type: 'sub-bumped',
        sub: Number(params.subNumber),
        bump: !!message.args[0].getInteger(),
    }),

    //
    // OSC Show File Information
    //
    '/eos/out/show/name': message => ({
        type: 'show-name',
        showName: message.args[0].getString(),
    }),

    '/eos/out/event/show/loaded': message => ({
        type: 'show-loaded',
        filePath: message.args[0].getString(),
    }),

    '/eos/out/event/show/saved': message => ({
        type: 'show-saved',
        filePath: message.args[0].getString(),
    }),

    '/eos/out/event/show/cleared': () => ({
        type: 'show-cleared',
    }),

    //
    // OSC Miscellaneous Console Events
    //
    '/eos/out/event/locked': message => ({
        type: 'locked',
        locked: !!message.args[0].getInteger(),
    }),

    '/eos/out/event/state': message => ({
        type: 'state',
        state: STATE_LOOKUP[message.args[0].getInteger()],
    }),
};
