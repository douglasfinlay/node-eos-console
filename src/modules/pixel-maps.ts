import {
    EosConsole,
    GetRecordTargetListProgressCallback,
} from '../eos-console';
import { PixelMap } from '../record-targets';
import { PixelMapRequest } from '../requests';
import { EosRecordTargetModule } from './eos-record-target-module';

export class PixelMapsModule extends EosRecordTargetModule<'pixmap'> {
    constructor(eos: EosConsole) {
        super(eos, 'pixmap');
    }

    async getAll(
        progressCallback?: GetRecordTargetListProgressCallback,
    ): Promise<PixelMap[]> {
        return this.getRecordTargetList(
            'pixmap',
            i => PixelMapRequest.index(i),
            progressCallback,
        );
    }

    async get(targetNumber: number): Promise<PixelMap | null> {
        return await this.eos.request(PixelMapRequest.get(targetNumber));
    }
}
