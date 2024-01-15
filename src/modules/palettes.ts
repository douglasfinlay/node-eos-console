import { GetRecordTargetListProgressCallback } from '../eos-console';
import { TargetNumber } from '../eos-types';
import { Palette, PaletteType } from '../record-targets';
import { PaletteRequest } from '../requests';
import { RecordTargetModule } from './record-target-module';

export class PalettesModule extends RecordTargetModule<PaletteType> {
    async getAll(
        progressCallback?: GetRecordTargetListProgressCallback,
    ): Promise<Palette[]> {
        return this.getRecordTargetList(
            this.targetType,
            i => PaletteRequest.index(i, this.targetType),
            progressCallback,
        );
    }

    async get(targetNumber: TargetNumber): Promise<Palette | null> {
        return this.getEos().request(
            PaletteRequest.get(targetNumber, this.targetType),
        );
    }
}
