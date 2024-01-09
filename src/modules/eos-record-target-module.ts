import {
    EosConsole,
    GetRecordTargetListProgressCallback,
} from '../eos-console';
import { TargetNumber } from '../eos-types';
import { RecordTargetType, RecordTargets } from '../record-targets';
import { EosRecordTargetRequest } from '../requests';
import { RecordTargetCountRequest } from '../requests/record-target-count-request';
import { EosConsoleModule } from './eos-console-module';

export abstract class EosRecordTargetModule<
    TTargetType extends Exclude<RecordTargetType, 'cue'>,
> extends EosConsoleModule {
    constructor(
        eos: EosConsole,
        private readonly targetType: TTargetType,
    ) {
        super(eos);
    }

    abstract getAll(
        progressCallback?: GetRecordTargetListProgressCallback,
    ): Promise<RecordTargets[TTargetType][]>;

    abstract get(
        targetNumber: TargetNumber,
        targetList?: TargetNumber,
    ): Promise<RecordTargets[TTargetType] | null>;

    async getRecordTargetList(
        targetType: TTargetType,
        indexRequestFactory: (
            index: number,
        ) => EosRecordTargetRequest<RecordTargets[TTargetType]>,
        progressCallback?: GetRecordTargetListProgressCallback,
    ) {
        const total = await this.getCount();

        if (total === 0) {
            return [];
        }

        let completedCount = 0;

        const requestPromises = new Array<
            Promise<RecordTargets[TTargetType] | null>
        >(total);

        for (let i = 0; i < total; i++) {
            requestPromises[i] = this.eos
                .request(indexRequestFactory(i))
                .then(recordTarget => {
                    completedCount += 1;
                    progressCallback?.(completedCount, total);

                    return recordTarget;
                });
        }

        const recordTargets = await Promise.all(requestPromises);

        if (recordTargets.includes(null)) {
            throw new Error(
                `null record target found when requesting record target list "${targetType}"`,
            );
        }

        return recordTargets as RecordTargets[TTargetType][];
    }

    private async getCount(): Promise<number> {
        return await this.eos.request(
            new RecordTargetCountRequest(this.targetType),
        );
    }
}
