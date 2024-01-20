import { PagedBanksModule } from './paged-banks';

export type DirectSelectsBankTargetType =
    | 'bp'
    | 'chan'
    | 'cp'
    | 'curve'
    | 'fp'
    | 'fx'
    | 'group'
    | 'ip'
    | 'macro'
    | 'ms'
    | 'pixmap'
    | 'preset'
    | 'scene'
    | 'snap'
    | 'sub';

export interface DirectSelectsBankConfig {
    buttonCount: number;
    flexi?: boolean;
    page?: number;
    targetType: DirectSelectsBankTargetType;
}

export class DirectSelectsBanksModule extends PagedBanksModule {
    constructor() {
        super('ds');
    }

    async create(bank: number, config: DirectSelectsBankConfig): Promise<void> {
        let address = `/eos/ds/${bank}/${config.targetType}`;

        if (config.flexi) {
            address += '/flexi';
        }

        if (config.page && config.page >= 1) {
            address += `/${config.page}`;
        }

        address += `/${config.buttonCount}`;

        await this.getEos().sendMessage(address);
    }

    async press(bank: number, button: number) {
        await this.getEos().sendMessage(`/eos/ds/${bank}/${button}`);
    }
}
