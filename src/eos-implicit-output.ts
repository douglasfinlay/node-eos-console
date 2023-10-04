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

type EosUserOutput = {
    kind: 'user';
    data: number;
};

type EosCmdOutput = {
    kind: 'cmd';
    data: string;
};

type EosUserCmdOutput = {
    kind: 'user-cmd';
    data: {
        userId: number;
        cmd: string;
    };
};

type EosShowNameOutput = {
    kind: 'show-name';
    data: string;
};

type EosActiveCueOutput = {
    kind: 'active-cue';
    data: {
        cueList: number;
        cueNumber: string;
    };
};

type EosPendingCueOutput = {
    kind: 'pending-cue';
    data: {
        cueList: number;
        cueNumber: string;
    };
};

type EosPreviousCueOutput = {
    kind: 'previous-cue';
    data: {
        cueList: number;
        cueNumber: string;
    };
};

type EosSoftkeyOutput = {
    kind: 'softkey';
    data: {
        softkey: number;
        label: string;
    };
};

type EosActiveCueTextOutput = {
    kind: 'active-cue-text';
    data: string;
};

type EosPendingCueTextOutput = {
    kind: 'pending-cue-text';
    data: string;
};

type EosPreviousCueTextOutput = {
    kind: 'previous-cue-text';
    data: string;
};

type EosActiveCuePercentOutput = {
    kind: 'active-cue-percent';
    data: number;
};

type EosStateOutput = {
    kind: 'state';
    data: EosState;
};

type EosLockedOutput = {
    kind: 'locked';
    data: boolean;
};

type EosColorHueSatOutput = {
    kind: 'color-hs';
    data: EosColorHueSat | null;
};

type EosFocusPanTiltOutput = {
    kind: 'focus-pan-tilt';
    data: EosFocusPanTilt | null;
};

type EosFocusXYZOutput = {
    kind: 'focus-xyz';
    data: EosFocusXYZ | null;
};

type EosActiveWheelOutput = {
    kind: 'active-wheel';
    data: {
        category: EosWheelCategory;
        parameter: string;
        value: number;
        wheelNumber: number;
    };
};

type EosActiveChannelOutput = {
    kind: 'active-channel';
    data: string[];
};

const USER_CMD_OSC_ADDRESS = /^\/eos\/out\/user\/(?<userId>\d+)\/cmd$/;

const SOFTKEY_OSC_ADDRESS = /^\/eos\/out\/softkey\/(?<softkey>\d+)$/;

const ACTIVE_CUE_OSC_ADDRESS =
    /^\/eos\/out\/active\/cue\/(?<cueList>\d+)\/(?<cueNumber>\d+|\d+.\d+$)/;

const PENDING_CUE_OSC_ADDRESS =
    /^\/eos\/out\/pending\/cue\/(?<cueList>\d+)\/(?<cueNumber>\d+|\d+.\d+$)/;

const PREVIOUS_CUE_OSC_ADDRESS =
    /^\/eos\/out\/previous\/cue\/(?<cueList>\d+)\/(?<cueNumber>\d+|\d+.\d+$)/;

const ACTIVE_WHEEL_OSC_ADDRESS =
    /^\/eos\/out\/active\/wheel\/(?<wheelNumber>\d+)$/;

export function parseImplicitOutput(
    message: EosOscMessage,
): EosImplicitOutput | null {
    let result: EosImplicitOutput | null = null;

    if (message.address === '/eos/out/color/hs') {
        result = {
            kind: 'color-hs',
            data:
                message.args.length === 2
                    ? {
                          hue: Number(message.args[0]),
                          saturation: Number(message.args[1]),
                      }
                    : null,
        };
    } else if (message.address === '/eos/out/pantilt') {
        result = {
            kind: 'focus-pan-tilt',
            data:
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
        };
    } else if (message.address === '/eos/out/xyz') {
        result = {
            kind: 'focus-xyz',
            data:
                message.args.length === 3
                    ? {
                          x: Number(message.args[0]),
                          y: Number(message.args[1]),
                          z: Number(message.args[2]),
                      }
                    : null,
        };
    } else if (message.address === '/eos/out/event/locked') {
        result = {
            kind: 'locked',
            data: !!message.args[0],
        };
    } else if (message.address === '/eos/out/event/state') {
        result = {
            kind: 'state',
            data: Number(message.args[0]),
        };
    } else if (message.address === '/eos/out/active/cue') {
        result = {
            kind: 'active-cue-percent',
            data: Number(message.args[0]),
        };
    } else if (message.address === '/eos/out/active/cue/text') {
        result = {
            kind: 'active-cue-text',
            data: message.args[0],
        };
    } else if (message.address === '/eos/out/pending/cue/text') {
        result = {
            kind: 'pending-cue-text',
            data: message.args[0],
        };
    } else if (message.address === '/eos/out/previous/cue/text') {
        result = {
            kind: 'previous-cue-text',
            data: message.args[0],
        };
    } else if (message.address === '/eos/out/user') {
        result = {
            kind: 'user',
            data: Number(message.args[0]),
        };
    } else if (message.address === '/eos/out/cmd') {
        result = {
            kind: 'cmd',
            data: message.args[0],
        };
    } else if (USER_CMD_OSC_ADDRESS.test(message.address)) {
        result = {
            kind: 'user-cmd',
            data: {
                userId: Number(message.address.split('/')[4]),
                cmd: message.args[0],
            },
        };
    } else if (SOFTKEY_OSC_ADDRESS.test(message.address)) {
        result = {
            kind: 'softkey',
            data: {
                softkey: Number(message.address.split('/')[4]),
                label: message.args[0],
            },
        };
    } else if (message.address === '/eos/out/show/name') {
        result = {
            kind: 'show-name',
            data: message.args[0],
        };
    } else if (ACTIVE_CUE_OSC_ADDRESS.test(message.address)) {
        result = {
            kind: 'active-cue',
            data: {
                cueList: Number(message.address.split('/')[5]),
                cueNumber: message.address.split('/')[6],
            },
        };
    } else if (PENDING_CUE_OSC_ADDRESS.test(message.address)) {
        result = {
            kind: 'pending-cue',
            data: {
                cueList: Number(message.address.split('/')[5]),
                cueNumber: message.address.split('/')[6],
            },
        };
    } else if (PREVIOUS_CUE_OSC_ADDRESS.test(message.address)) {
        result = {
            kind: 'previous-cue',
            data: {
                cueList: Number(message.address.split('/')[5]),
                cueNumber: message.address.split('/')[6],
            },
        };
    } else if (ACTIVE_WHEEL_OSC_ADDRESS.test(message.address)) {
        // Remove the "current value" text in square brackets
        let parameter = message.args[0] as string;
        const i = parameter.lastIndexOf('[');
        parameter = parameter.substring(0, i).trimEnd();

        result = {
            kind: 'active-wheel',
            data: {
                wheelNumber: Number(message.address.split('/')[5]),
                parameter,
                category: Number(message.args[1]),
                value: Number(message.args[2]),
            },
        };
    } else if (message.address === '/eos/out/active/chan') {
        const rawChannels = message.args[0] as string;
        const i = rawChannels.indexOf(' ');

        const channels = expandTargetNumberArguments(
            rawChannels
                .substring(0, i)
                .split(',')
                .filter(x => x.length),
        );

        result = {
            kind: 'active-channel',
            data: channels,
        };
    } else {
        console.warn(`Unrecognised implicit output:`, message);
    }

    return result;
}
