"use strict";
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
function getGlobal() {
    if (typeof globalThis !== "undefined") {
        return globalThis;
    }
    if (typeof self !== "undefined") {
        return self;
    }
    if (typeof window !== "undefined") {
        return window;
    }
    if (typeof global !== "undefined") {
        return global;
    }
    return undefined;
}
const ctx = getGlobal();
if (typeof ctx.fetch === "undefined") {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { fetch, Request, Response, Headers } = require("undici");
    ctx.fetch = fetch;
    ctx.Request = Request;
    ctx.Response = Response;
    ctx.Headers = Headers;
}
const streamClasses = [
    "TextDecoderStream",
    "TextEncoderStream",
    "TransformStream",
    "ReadableStream",
    "WritableStream",
    "ByteLengthQueuingStrategy",
    "CountQueuingStrategy",
];
for (const clsName of streamClasses) {
    if (typeof ctx[clsName] === "undefined") {
        ctx[clsName] = require("stream/web")[clsName];
    }
}
__exportStar(require("./index"), exports);
//# sourceMappingURL=node.js.map