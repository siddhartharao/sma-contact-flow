"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadContactFlow = void 0;
const aws_sdk_1 = require("aws-sdk");
const aws_sdk_2 = require("aws-sdk");
const s3Bucket = "flow-cache";
const cacheTimeInMilliseconds = 3000;
function loadContactFlow(amazonConnectInstanceID, amazonConnectContactFlowID) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Entering load contact flow");
        const describeContactFlowParams = {
            ContactFlowId: amazonConnectContactFlowID,
            InstanceId: amazonConnectInstanceID
        };
        let rv = yield checkFlowCache(amazonConnectInstanceID, amazonConnectContactFlowID);
        if (rv == null) {
            console.log("Flow cache miss");
            const connect = new aws_sdk_1.Connect();
            const contactFlowResponse = yield connect.describeContactFlow(describeContactFlowParams).promise();
            rv = JSON.parse(contactFlowResponse.ContactFlow.Content);
            yield writeFlowCache(rv, amazonConnectInstanceID, amazonConnectContactFlowID);
        }
        return rv;
    });
}
exports.loadContactFlow = loadContactFlow;
function writeFlowCache(flow, amazonConnectInstanceID, amazonConnectContactFlowID) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Writing flow cache");
        let flowBinary = Buffer.from(JSON.stringify(flow), 'binary');
        const s3Params = {
            Bucket: s3Bucket,
            Key: amazonConnectContactFlowID,
            Body: flowBinary
        };
        const s3 = new aws_sdk_2.S3();
        yield s3.putObject(s3Params).promise();
    });
}
function checkFlowCache(amazonConnectInstanceID, amazonConnectContactFlowID) {
    return __awaiter(this, void 0, void 0, function* () {
        let rv = null;
        const s3Params = {
            Bucket: s3Bucket,
            Key: amazonConnectContactFlowID
        };
        const s3 = new aws_sdk_2.S3();
        try {
            let s3Head = yield s3.headObject(s3Params).promise();
            var deltaTimeInMs = new Date().getTime() - s3Head.LastModified.getTime();
            console.log("Delta Time: " + deltaTimeInMs);
            if (deltaTimeInMs < cacheTimeInMilliseconds) {
                console.log("Loading flow from cache");
                let s3Result = yield s3.getObject(s3Params).promise();
                rv = JSON.parse(s3Result.Body.toString());
            }
        }
        catch (error) {
            if (error.name === 'NotFound') {
                rv = null;
            }
            else {
                throw error;
            }
        }
        return rv;
    });
}
