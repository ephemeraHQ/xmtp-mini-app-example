"use strict";
/* eslint-disable */
// @ts-nocheck
/*
* This file is a generated Typescript file for GRPC Gateway, DO NOT MODIFY
*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageApi = exports.SortDirection = void 0;
const fm = __importStar(require("../../fetch.pb"));
var SortDirection;
(function (SortDirection) {
    SortDirection["SORT_DIRECTION_UNSPECIFIED"] = "SORT_DIRECTION_UNSPECIFIED";
    SortDirection["SORT_DIRECTION_ASCENDING"] = "SORT_DIRECTION_ASCENDING";
    SortDirection["SORT_DIRECTION_DESCENDING"] = "SORT_DIRECTION_DESCENDING";
})(SortDirection = exports.SortDirection || (exports.SortDirection = {}));
class MessageApi {
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
exports.MessageApi = MessageApi;
//# sourceMappingURL=message_api.pb.js.map