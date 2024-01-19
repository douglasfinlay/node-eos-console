import { EosConsoleModule } from './eos-console-module';

export abstract class PagedBanksModule extends EosConsoleModule {
    constructor(private bankType: string) {
        super();
    }

    async pageDown(bank: number, pageDelta = 1) {
        await this.getEos().sendMessage(
            `/eos/${this.bankType}/${bank}/page/${pageDelta}`,
        );
    }

    async pageUp(bank: number, pageDelta = 1) {
        await this.pageDown(bank, -pageDelta);
    }
}
