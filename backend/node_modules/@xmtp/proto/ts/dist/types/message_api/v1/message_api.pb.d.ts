import * as fm from "../../fetch.pb";
declare type Absent<T, K extends keyof T> = {
    [k in Exclude<keyof T, K>]?: undefined;
};
declare type OneOf<T> = {
    [k in keyof T]?: undefined;
} | (keyof T extends infer K ? (K extends string & keyof T ? {
    [k in K]: T[K];
} & Absent<T, K> : never) : never);
export declare enum SortDirection {
    SORT_DIRECTION_UNSPECIFIED = "SORT_DIRECTION_UNSPECIFIED",
    SORT_DIRECTION_ASCENDING = "SORT_DIRECTION_ASCENDING",
    SORT_DIRECTION_DESCENDING = "SORT_DIRECTION_DESCENDING"
}
export declare type IndexCursor = {
    digest?: Uint8Array;
    senderTimeNs?: string;
};
declare type BaseCursor = {};
export declare type Cursor = BaseCursor & OneOf<{
    index: IndexCursor;
}>;
export declare type PagingInfo = {
    limit?: number;
    cursor?: Cursor;
    direction?: SortDirection;
};
export declare type Envelope = {
    contentTopic?: string;
    timestampNs?: string;
    message?: Uint8Array;
};
export declare type PublishRequest = {
    envelopes?: Envelope[];
};
export declare type PublishResponse = {};
export declare type SubscribeRequest = {
    contentTopics?: string[];
};
export declare type SubscribeAllRequest = {};
export declare type QueryRequest = {
    contentTopics?: string[];
    startTimeNs?: string;
    endTimeNs?: string;
    pagingInfo?: PagingInfo;
};
export declare type QueryResponse = {
    envelopes?: Envelope[];
    pagingInfo?: PagingInfo;
};
export declare type BatchQueryRequest = {
    requests?: QueryRequest[];
};
export declare type BatchQueryResponse = {
    responses?: QueryResponse[];
};
export declare class MessageApi {
    static Publish(req: PublishRequest, initReq?: fm.InitReq): Promise<PublishResponse>;
    static Subscribe(req: SubscribeRequest, entityNotifier?: fm.NotifyStreamEntityArrival<Envelope>, initReq?: fm.InitReq): Promise<void>;
    static SubscribeAll(req: SubscribeAllRequest, entityNotifier?: fm.NotifyStreamEntityArrival<Envelope>, initReq?: fm.InitReq): Promise<void>;
    static Query(req: QueryRequest, initReq?: fm.InitReq): Promise<QueryResponse>;
    static BatchQuery(req: BatchQueryRequest, initReq?: fm.InitReq): Promise<BatchQueryResponse>;
}
export {};
