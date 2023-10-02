import { RecordTarget } from './record-target';

export interface Cue extends RecordTarget {
    cueListNumber: number;
    cueNumber: string;
    cuePartNumber: number;
    isPart: boolean;
    isSceneEnd: boolean;
    label: string;
    scene: string;
    notes: string;
}
