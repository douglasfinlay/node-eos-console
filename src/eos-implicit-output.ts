import { EosOscMessage } from './eos-osc-stream';
import { EosState } from './eos-types';

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
    | EosLockedOutput;

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

const USER_CMD_ADDRESS = /^\/eos\/out\/user\/(?<userId>\d+)\/cmd$/;

const SOFTKEY_ADDRESS = /^\/eos\/out\/softkey\/(?<softkey>\d+)$/;

const ACTIVE_CUE_OSC_ADDRESS =
    /^\/eos\/out\/active\/cue\/(?<cueList>\d+)\/(?<cueNumber>\d+|\d+.\d+$)/;

const PENDING_CUE_OSC_ADDRESS =
    /^\/eos\/out\/pending\/cue\/(?<cueList>\d+)\/(?<cueNumber>\d+|\d+.\d+$)/;

const PREVIOUS_CUE_OSC_ADDRESS =
    /^\/eos\/out\/previous\/cue\/(?<cueList>\d+)\/(?<cueNumber>\d+|\d+.\d+$)/;

export function parseImplicitOutput(
    message: EosOscMessage,
): EosImplicitOutput | null {
    let result: EosImplicitOutput | null = null;

    if (message.address === '/eos/out/event/locked') {
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
    } else if (USER_CMD_ADDRESS.test(message.address)) {
        result = {
            kind: 'user-cmd',
            data: {
                userId: Number(message.address.split('/')[4]),
                cmd: message.args[0],
            },
        };
    } else if (SOFTKEY_ADDRESS.test(message.address)) {
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
    } else {
        console.warn(`Unrecognised implicit output:`, message);
    }

    return result;
}
