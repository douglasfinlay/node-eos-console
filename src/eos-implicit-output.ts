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
import { OscRouteParamMap } from './osc-router';
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
    event: 'user';
    userId: number;
}

interface EosCmdOutput {
    event: 'cmd';
    commandLine: string;
}

interface EosUserCmdOutput {
    event: 'user-cmd';
    userId: number;
    commandLine: string;
}

interface EosShowNameOutput {
    event: 'show-name';
    showName: string;
}

interface EosCueOutput {
    event: 'active-cue';
    cue: EosCueIdentifier;
}

interface EosNullableCueOutput {
    event: 'pending-cue' | 'previous-cue';
    cue: EosCueIdentifier | null;
}

interface EosSoftKeyOutput {
    event: 'soft-key';
    index: number;
    label: string;
}

interface EosCueTextOutput {
    event: 'active-cue-text' | 'pending-cue-text' | 'previous-cue-text';
    text: string;
}

interface EosActiveCuePercentOutput {
    event: 'active-cue-percent';
    percentComplete: number;
}

interface EosStateOutput {
    event: 'state';
    state: EosState;
}

interface EosLockedOutput {
    event: 'locked';
    locked: boolean;
}

interface EosColorHueSatOutput {
    event: 'color-hs';
    color: EosColorHueSat | null;
}

interface EosFocusPanTiltOutput {
    event: 'focus-pan-tilt';
    focus: EosFocusPanTilt | null;
}

interface EosFocusXYZOutput {
    event: 'focus-xyz';
    focus: EosFocusXYZ | null;
}

interface EosActiveWheelOutput {
    event: 'active-wheel';
    index: number;
    wheel: EosWheel | null;
}

interface EosActiveChannelOutput {
    event: 'active-channel';
    channels: TargetNumber[];
}

interface EosShowClearedOutput {
    event: 'show-cleared';
}

interface EosShowFilePathOutput {
    event: 'show-loaded' | 'show-saved';
    filePath: string;
}

interface EosCuePlaybackEvent {
    event: 'cue-fired' | 'cue-stopped';
    cue: EosCueIdentifier;
    label: string;
}

interface EosWheelModeOutput {
    event: 'wheel-mode' | 'switch-mode';
    mode: EosWheelMode;
}

interface EosMacroEvent {
    event: 'macro-fired';
    macro: TargetNumber;
}

interface EosSubEvent {
    event: 'sub-bumped';
    sub: TargetNumber;
    bump: boolean;
}

interface EosRelayEvent {
    event: 'relay-state';
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

type ImplicitOutputHandler<
    Address extends `/eos/out/${string}`,
    Output extends EosImplicitOutput,
> = (message: OscMessage, params: OscRouteParamMap<Address>) => Output;

interface ImplicitOutputTypeMap {
    '/eos/out/color/hs': EosColorHueSatOutput;
    '/eos/out/pantilt': EosFocusPanTiltOutput;
    '/eos/out/xyz': EosFocusXYZOutput;
    '/eos/out/softkey/{softkey}': EosSoftKeyOutput;

    //
    // Command Lines
    //
    '/eos/out/cmd': EosCmdOutput;
    '/eos/out/user/{userId}/cmd': EosUserCmdOutput;

    //
    // Settings
    //
    '/eos/out/switch': EosWheelModeOutput;
    '/eos/out/user': EosUserOutput;
    '/eos/out/wheel': EosWheelModeOutput;

    //
    // Active Channels and Parameters
    //
    '/eos/out/active/chan': EosActiveChannelOutput;
    '/eos/out/active/wheel/{wheelNumber}': EosActiveWheelOutput;

    //
    // Cues
    //
    '/eos/out/active/cue': EosActiveCuePercentOutput;
    '/eos/out/active/cue/{cueList}/{cueNumber}': EosCueOutput;
    '/eos/out/active/cue/text': EosCueTextOutput;
    '/eos/out/pending/cue': EosNullableCueOutput;
    '/eos/out/pending/cue/{cueList}/{cueNumber}': EosNullableCueOutput;
    '/eos/out/pending/cue/text': EosCueTextOutput;
    '/eos/out/previous/cue': EosNullableCueOutput;
    '/eos/out/previous/cue/{cueList}/{cueNumber}': EosNullableCueOutput;
    '/eos/out/previous/cue/text': EosCueTextOutput;

    //
    // TODO: Direct Select Banks
    //

    //
    // TODO: Fader Banks
    //

    //
    // Show Control Events
    //
    '/eos/out/event/cue/{cueList}/{cueNumber}/fire': EosCuePlaybackEvent;
    '/eos/out/event/cue/{cueList}/{cueNumber}/stop': EosCuePlaybackEvent;
    '/eos/out/event/macro/{macroNumber}': EosMacroEvent;
    '/eos/out/event/relay/{relayNumber}/{groupNumber}': EosRelayEvent;
    '/eos/out/event/sub/{subNumber}': EosSubEvent;

    //
    // Show File Information
    //
    '/eos/out/show/name': EosShowNameOutput;
    '/eos/out/event/show/loaded': EosShowFilePathOutput;
    '/eos/out/event/show/saved': EosShowFilePathOutput;
    '/eos/out/event/show/cleared': EosShowClearedOutput;

    //
    // Miscellaneous Console Events
    //
    '/eos/out/event/locked': EosLockedOutput;
    '/eos/out/event/state': EosStateOutput;
}

type ImplicitOutput = {
    [Key in keyof ImplicitOutputTypeMap]: ImplicitOutputHandler<
        Key,
        ImplicitOutputTypeMap[Key]
    >;
};

export const EOS_IMPLICIT_OUTPUT: ImplicitOutput = {
    '/eos/out/color/hs': message => ({
        event: 'color-hs',
        color:
            message.args.length === 2
                ? {
                      hue: message.args[0].getFloat(),
                      saturation: message.args[1].getFloat(),
                  }
                : null,
    }),

    '/eos/out/pantilt': message => ({
        event: 'focus-pan-tilt',
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
        event: 'focus-xyz',
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
        event: 'soft-key',
        index: Number(params.softkey) - 1,
        label: message.args[0].getString(),
    }),

    //
    // Command Lines
    //
    '/eos/out/cmd': message => ({
        event: 'cmd',
        commandLine: message.args[0].getString(),
    }),

    '/eos/out/user/{userId}/cmd': (message, params) => ({
        event: 'user-cmd',
        userId: Number(params.userId),
        commandLine: message.args[0].getString(),
    }),

    //
    // Settings
    //
    '/eos/out/switch': message => ({
        event: 'switch-mode',
        mode: WHEEL_MODE_LOOKUP[message.args[0].getInteger()],
    }),

    '/eos/out/user': message => ({
        event: 'user',
        userId: message.args[0].getInteger(),
    }),

    '/eos/out/wheel': message => ({
        event: 'wheel-mode',
        mode: WHEEL_MODE_LOOKUP[message.args[0].getInteger()],
    }),

    //
    // Active Channels and Parameters
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
            event: 'active-channel',
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
            event: 'active-wheel',
            index: Number(params.wheelNumber) - 1,
            wheel,
        };
    },

    //
    // Cues
    //
    '/eos/out/active/cue/{cueList}/{cueNumber}': (_, params) => ({
        event: 'active-cue',
        cue: {
            cueList: Number(params.cueList),
            cueNumber: Number(params.cueNumber),
        },
    }),

    '/eos/out/active/cue': message => ({
        event: 'active-cue-percent',
        percentComplete: message.args[0].getInteger(),
    }),

    '/eos/out/active/cue/text': message => ({
        event: 'active-cue-text',
        text: message.args[0].getString(),
    }),

    '/eos/out/pending/cue': () => ({
        event: 'pending-cue',
        cue: null,
    }),

    '/eos/out/pending/cue/{cueList}/{cueNumber}': (_, params) => ({
        event: 'pending-cue',
        cue: {
            cueList: Number(params.cueList),
            cueNumber: Number(params.cueNumber),
        },
    }),

    '/eos/out/pending/cue/text': message => ({
        event: 'pending-cue-text',
        text: message.args[0].getString(),
    }),

    '/eos/out/previous/cue': () => ({
        event: 'previous-cue',
        cue: null,
    }),

    '/eos/out/previous/cue/{cueList}/{cueNumber}': (_, params) => ({
        event: 'previous-cue',
        cue: {
            cueList: Number(params.cueList),
            cueNumber: Number(params.cueNumber),
        },
    }),

    '/eos/out/previous/cue/text': message => ({
        event: 'previous-cue-text',
        text: message.args[0].getString(),
    }),

    //
    // TODO: Direct Select Banks
    //

    //
    // TODO: Fader Banks
    //

    //
    // Show Control Events
    //
    '/eos/out/event/cue/{cueList}/{cueNumber}/fire': (message, params) => ({
        event: 'cue-fired',
        cue: {
            cueList: Number(params.cueList),
            cueNumber: Number(params.cueNumber),
        },
        label: message.args[0].getString(),
    }),

    '/eos/out/event/cue/{cueList}/{cueNumber}/stop': (message, params) => ({
        event: 'cue-stopped',
        cue: {
            cueList: Number(params.cueList),
            cueNumber: Number(params.cueNumber),
        },
        label: message.args[0].getString(),
    }),

    '/eos/out/event/macro/{macroNumber}': (_, params) => ({
        event: 'macro-fired',
        macro: Number(params.macroNumber),
    }),

    '/eos/out/event/relay/{relayNumber}/{groupNumber}': (message, params) => ({
        event: 'relay-state',
        active: !!message.args[0],
        group: Number(params.groupNumber),
        relay: Number(params.relayNumber),
    }),

    '/eos/out/event/sub/{subNumber}': (message, params) => ({
        event: 'sub-bumped',
        sub: Number(params.subNumber),
        bump: !!message.args[0].getInteger(),
    }),

    //
    // Show File Information
    //
    '/eos/out/show/name': message => ({
        event: 'show-name',
        showName: message.args[0].getString(),
    }),

    '/eos/out/event/show/loaded': message => ({
        event: 'show-loaded',
        filePath: message.args[0].getString(),
    }),

    '/eos/out/event/show/saved': message => ({
        event: 'show-saved',
        filePath: message.args[0].getString(),
    }),

    '/eos/out/event/show/cleared': () => ({
        event: 'show-cleared',
    }),

    //
    // Miscellaneous Console Events
    //
    '/eos/out/event/locked': message => ({
        event: 'locked',
        locked: !!message.args[0].getInteger(),
    }),

    '/eos/out/event/state': message => ({
        event: 'state',
        state: STATE_LOOKUP[message.args[0].getInteger()],
    }),
};
