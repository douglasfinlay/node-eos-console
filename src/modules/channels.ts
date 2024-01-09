import {
    EosConsole,
    GetRecordTargetListProgressCallback,
} from '../eos-console';
import { TargetNumber } from '../eos-types';
import { Channel, ChannelPart, Patch } from '../record-targets';
import { PatchRequest } from '../requests';
import { EosConsoleModule } from './eos-console-module';
import { EosRecordTargetModule } from './eos-record-target-module';

export class ChannelsModule extends EosConsoleModule {
    private patchModule: PatchModule;

    constructor(eos: EosConsole) {
        super(eos);

        this.patchModule = new PatchModule(eos);
    }

    async getAll(
        progressCallback?: GetRecordTargetListProgressCallback,
    ): Promise<Channel[]> {
        const patch = await this.patchModule.getRecordTargetList(
            'patch',
            i => PatchRequest.index(i),
            progressCallback,
        );

        const groupByTargetNumber = patch.reduce<Record<TargetNumber, Patch[]>>(
            (group, entry) => {
                const { targetNumber } = entry;
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                group[targetNumber] ??= [];
                group[targetNumber].push(entry);

                return group;
            },
            {},
        );

        return Object.values(groupByTargetNumber).map(transformPatchToChannel);
    }

    async get(targetNumber: TargetNumber): Promise<Channel | null> {
        // Make an initial request to determine the number of parts
        const firstPart = await this.patchModule.get(targetNumber, 1);

        if (!firstPart) {
            return null;
        }

        // Request the remaining parts if there are any
        const remainingPartRequests: Promise<Patch | null>[] = [];

        for (let part = 2; part <= firstPart.partCount; part++) {
            remainingPartRequests.push(
                this.patchModule.get(targetNumber, part),
            );
        }

        const remainingParts = await Promise.all(remainingPartRequests);

        if (remainingParts.includes(null)) {
            throw new Error(
                `null part found when requesting channel ${targetNumber}`,
            );
        }

        return transformPatchToChannel([
            firstPart,
            ...(remainingParts as Patch[]),
        ]);
    }
}

export class PatchModule extends EosRecordTargetModule<'patch'> {
    constructor(eos: EosConsole) {
        super(eos, 'patch');
    }

    async getAll(
        progressCallback?: GetRecordTargetListProgressCallback,
    ): Promise<Patch[]> {
        return this.getRecordTargetList(
            'patch',
            i => PatchRequest.index(i),
            progressCallback,
        );
    }

    async get(
        targetNumber: TargetNumber,
        partNumber: number,
    ): Promise<Patch | null> {
        return await this.eos.request(
            PatchRequest.get(targetNumber, partNumber),
        );
    }
}

function transformPatchToChannel(patchParts: Patch[]): Channel {
    const transformKeys: (keyof ChannelPart)[] = [
        'uid',
        'label',
        'address',
        'currentLevel',
        'fixtureManufacturer',
        'fixtureModel',
        'gel',
        'intensityParameterAddress',
        'notes',
        'text1',
        'text2',
        'text3',
        'text4',
        'text5',
        'text6',
        'text7',
        'text8',
        'text9',
        'text10',
    ];

    const targetNumber = patchParts[0].targetNumber;
    const parts = patchParts.map(part => {
        if (part.targetNumber !== targetNumber) {
            throw new Error(
                'unexpected target number when transforming patch entry',
            );
        }

        return Object.fromEntries(
            transformKeys
                .filter(key => key in part)
                .map(key => [key, part[key]]),
        ) as ChannelPart;
    });

    return {
        targetType: 'patch',
        targetNumber,
        parts,
    };
}
