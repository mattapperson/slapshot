export type SlapshotDataFormat = { thrownError?: any; results: any };

export interface Snapshot {
    [key: string]: SlapshotDataFormat;
}

export type ValidationCallback = (liveData: any, snapshottedData: any) => void;

export type ValidationObject = {
    ignore?: string[];
    check?: string[];
};
export type ValidationOptions = boolean | ValidationCallback | ValidationObject;
export type MemorizeOptions = {
    pure?: boolean;
    validateSnapshot?: ValidationOptions;
};

export type Json =
    | null
    | boolean
    | number
    | string
    | Json[]
    | { [prop: string]: Json };

export type JsonObject = { [prop: string]: Json };

export type JsonCompatible<T> = {
    [P in keyof T]: T[P] extends Json
        ? T[P]
        : Pick<T, P> extends Required<Pick<T, P>>
        ? never
        : T[P] extends (() => any) | undefined
        ? never
        : JsonCompatible<T[P]>;
};
