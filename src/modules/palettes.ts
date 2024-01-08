import {
    EosConsole,
    GetRecordTargetListProgressCallback,
} from '../eos-console';
import { Palette, PaletteType } from '../record-targets';
import { PaletteRequest } from '../requests';
import { EosRecordTargetModule } from './eos-record-target-module';

export class PalettesModule extends EosRecordTargetModule<PaletteType> {
    constructor(
        eos: EosConsole,
        private paletteType: PaletteType,
    ) {
        super(eos, paletteType);
    }

    async getAll(
        progressCallback?: GetRecordTargetListProgressCallback,
    ): Promise<Palette[]> {
        return this.getRecordTargetList(
            this.paletteType,
            i => PaletteRequest.index(i, this.paletteType),
            progressCallback,
        );
    }

    async get(targetNumber: number): Promise<Palette | null> {
        return await this.eos.request(
            PaletteRequest.get(targetNumber, this.paletteType),
        );
    }
}
