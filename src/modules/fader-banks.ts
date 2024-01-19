import { PagedBanksModule } from './paged-banks';

export interface FaderBankConfig {
    faderCount: number;
    page?: number;
}

export class FaderBanksModule extends PagedBanksModule {
    constructor() {
        super('fader');
    }

    /**
     * @param bank 1-based fader bank index, or 0 to reference the master fader
     * @param faderCount number of faders per page
     * @param page optional page number
     */
    async create(bank: number, config: FaderBankConfig): Promise<void> {
        let address = `/eos/fader/${bank}/config`;

        if (config.page && config.page >= 1) {
            address += `/${config.page}`;
        }

        address += `/${config.faderCount}`;

        await this.getEos().sendMessage(address);
    }

    async reset(faderBank: number): Promise<void> {
        await this.getEos().sendMessage(`/eos/fader/${faderBank}/reset`);
    }
}
