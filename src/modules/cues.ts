import { GetRecordTargetListProgressCallback } from '../eos-console';
import { TargetNumber } from '../eos-types';
import { Cue } from '../record-targets';
import { CueRequest, RecordTargetCountRequest } from '../requests';
import { EosConsoleModule } from './eos-console-module';

export class CuesModule extends EosConsoleModule {
    async fire(cueListNumber: TargetNumber, cueNumber: TargetNumber) {
        await this.eos.sendMessage(
            `/eos/cue/${cueListNumber}/${cueNumber}/fire`,
        );
    }

    async getAll(
        cueList: TargetNumber,
        progressCallback?: GetRecordTargetListProgressCallback,
    ): Promise<Cue[]> {
        const total = await this.eos.request(
            new RecordTargetCountRequest('cue', cueList),
        );

        if (total === 0) {
            return [];
        }

        let completedCount = 0;

        const cueRequests = new Array<Promise<Cue | null>>(total);

        for (let i = 0; i < total; i++) {
            cueRequests[i] = this.eos
                .request(CueRequest.index(i, cueList))
                .then(cue => {
                    completedCount += 1;
                    progressCallback?.(completedCount, total);

                    return cue;
                });
        }

        const cues = await Promise.all(cueRequests);

        if (cues.includes(null)) {
            throw new Error(
                'null record target found when requesting record target list "cue"',
            );
        }

        return cues as Cue[];
    }

    async get(
        cueList: TargetNumber,
        targetNumber: TargetNumber,
    ): Promise<Cue | null> {
        return await this.eos.request(CueRequest.get(targetNumber, cueList));
    }
}
