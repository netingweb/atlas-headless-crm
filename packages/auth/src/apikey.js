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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateApiKey = generateApiKey;
exports.hashApiKey = hashApiKey;
exports.verifyApiKey = verifyApiKey;
exports.extractPrefix = extractPrefix;
const crypto_1 = require("crypto");
const argon2 = __importStar(require("argon2"));
const API_KEY_PREFIX_LENGTH = 8;
const API_KEY_SECRET_LENGTH = 32;
function generateApiKey() {
    const secret = (0, crypto_1.randomBytes)(API_KEY_SECRET_LENGTH).toString('base64url');
    const prefix = (0, crypto_1.randomBytes)(API_KEY_PREFIX_LENGTH).toString('base64url');
    const fullKey = `crm_${prefix}_${secret}`;
    return { fullKey, prefix, secret };
}
async function hashApiKey(key) {
    return argon2.hash(key, {
        type: argon2.argon2id,
        memoryCost: 32768,
        timeCost: 2,
        parallelism: 2,
    });
}
async function verifyApiKey(hash, key) {
    try {
        return await argon2.verify(hash, key);
    }
    catch {
        return false;
    }
}
function extractPrefix(key) {
    const parts = key.split('_');
    if (parts.length >= 3 && parts[0] === 'crm') {
        return parts[1];
    }
    return null;
}
//# sourceMappingURL=apikey.js.map