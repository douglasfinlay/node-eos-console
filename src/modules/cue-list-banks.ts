import { TargetNumber } from '../eos-types';
import { PagedBanksModule } from './paged-banks';

export interface CueListBankConfig {
    /**
     * Set to 0 to reference the current cue list.
     */
    cueList: TargetNumber;

    offset?: number;
    pendingCueCount: number;
    prevCueCount: number;
}

export class CueListBanksModule extends PagedBanksModule {
    constructor() {
        super('cuelist');
    }

    async create(bank: number, config: CueListBankConfig): Promise<void> {
        let address = `/eos/cuelist/${bank}/config/${config.cueList}/${config.prevCueCount}/${config.pendingCueCount}`;

        if (config.offset && config.offset >= 0) {
            address += `/${config.offset}`;
        }

        await this.getEos().sendMessage(address);
    }

    async pageCurrent(bank: number) {
        await this.getEos().sendMessage(`/eos/cuelist/${bank}/page/0`);
    }

    async reset(bank: number): Promise<void> {
        await this.getEos().sendMessage(`/eos/cuelist/${bank}/reset`);
    }

    async selectCue(bank: number, cue: TargetNumber): Promise<void> {
        await this.getEos().sendMessage(`/eos/cuelist/${bank}/select/${cue}`);
    }
}
