export type SlapshotDataFormat = { thrownError?: any; results: any };

export interface Snapshot {
    [key: string]: SlapshotDataFormat;
}

export type ValidationCallback = (liveData: any, snapshottedData: any) => void;
export type ValidationOptions = boolean | ValidationCallback;
export type MemorizeOptions = {
    pure?: boolean;
    validateSnapshot?: ValidationOptions;
};
