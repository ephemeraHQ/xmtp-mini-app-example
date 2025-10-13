/* eslint-disable */
// @ts-nocheck
/*
* This file is a generated Typescript file for GRPC Gateway, DO NOT MODIFY
*/
import * as fm from "../../fetch.pb";
export var SortDirection;
(function (SortDirection) {
    SortDirection["SORT_DIRECTION_UNSPECIFIED"] = "SORT_DIRECTION_UNSPECIFIED";
    SortDirection["SORT_DIRECTION_ASCENDING"] = "SORT_DIRECTION_ASCENDING";
    SortDirection["SORT_DIRECTION_DESCENDING"] = "SORT_DIRECTION_DESCENDING";
})(SortDirection || (SortDirection = {}));
export class MessageApi {
    static Publish(req, initReq) {
        return fm.fetchReq(`/message/v1/publish`, Object.assign(Object.assign({}, initReq), { method: "POST", body: JSON.stringify(req, fm.replacer) }));
    }
    static Subscribe(req, entityNotifier, initReq) {
        return fm.fetchStreamingRequest(`/message/v1/subscribe`, entityNotifier, Object.assign(Object.assign({}, initReq), { method: "POST", body: JSON.stringify(req, fm.replacer) }));
    }
    static SubscribeAll(req, entityNotifier, initReq) {
        return fm.fetchStreamingRequest(`/message/v1/subscribe-all`, entityNotifier, Object.assign(Object.assign({}, initReq), { method: "POST", body: JSON.stringify(req, fm.replacer) }));
    }
    static Query(req, initReq) {
        return fm.fetchReq(`/message/v1/query`, Object.assign(Object.assign({}, initReq), { method: "POST", body: JSON.stringify(req, fm.replacer) }));
    }
    static BatchQuery(req, initReq) {
        return fm.fetchReq(`/message/v1/batch-query`, Object.assign(Object.assign({}, initReq), { method: "POST", body: JSON.stringify(req, fm.replacer) }));
    }
}
//# sourceMappingURL=message_api.pb.js.map