import { EosOscMessage } from './eos-osc-stream';

export type EosImplicitOutput =
    | EosCmdOutput
    | EosUserCmdOutput
    | EosShowNameOutput
    | EosActiveCueOutput
    | EosPendingCueOutput;

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
    data: string;
};

type EosPendingCueOutput = {
    kind: 'pending-cue';
    data: string;
};

const USER_CMD_ADDRESS = /^\/eos\/out\/user\/(?<UserId>\d+)\/cmd$/;

const ACTIVE_CUE_OSC_ADDRESS =
    /^\/eos\/out\/active\/cue\/1\/(?<cueNumber>\d+|\d+.\d+$)/;

const PENDING_CUE_OSC_ADDRESS =
    /^\/eos\/out\/pending\/cue\/1\/(?<cueNumber>\d+|\d+.\d+$)/;

export function parseImplicitOutput(
    message: EosOscMessage,
): EosImplicitOutput | null {
    let result: EosImplicitOutput | null = null;

    if (message.address === '/eos/out/cmd') {
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
    } else if (message.address === '/eos/out/show/name') {
        result = {
            kind: 'show-name',
            data: message.args[0],
        };
    } else if (ACTIVE_CUE_OSC_ADDRESS.test(message.address)) {
        result = {
            kind: 'active-cue',
            data: message.address.split('/')[6],
        };
    } else if (PENDING_CUE_OSC_ADDRESS.test(message.address)) {
        result = {
            kind: 'pending-cue',
            data: message.address.split('/')[6],
        };
    } else {
        console.warn(`Unrecognised implicit output: ${message.address}`);
    }

    return result;
}
