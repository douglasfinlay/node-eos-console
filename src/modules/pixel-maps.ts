import { GetRecordTargetListProgressCallback } from '../eos-console';
import { TargetNumber } from '../eos-types';
import { PixelMap } from '../record-targets';
import { PixelMapRequest } from '../requests';
import { RecordTargetModule } from './record-target-module';

export class PixelMapsModule extends RecordTargetModule<'pixmap'> {
    constructor() {
        super('pixmap');
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

    async get(targetNumber: TargetNumber): Promise<PixelMap | null> {
        return this.getEos().request(PixelMapRequest.get(targetNumber));
    }
}
