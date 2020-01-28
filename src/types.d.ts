export type SlapshotDataFormat = { thrownError?: any; results: any };

export interface Snapshot {
    [key: string]: SlapshotDataFormat;
}
