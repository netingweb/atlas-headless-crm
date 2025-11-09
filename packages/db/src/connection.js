"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectMongo = connectMongo;
exports.disconnectMongo = disconnectMongo;
exports.getDb = getDb;
const mongodb_1 = require("mongodb");
const utils_1 = require("../../utils/src");
let client = null;
let db = null;
async function connectMongo(uri, dbName) {
    if (db)
        return db;
    try {
        client = new mongodb_1.MongoClient(uri);
        await client.connect();
        db = client.db(dbName);
        utils_1.logger.info('MongoDB connected', { dbName });
        return db;
    }
    catch (error) {
        utils_1.logger.error('MongoDB connection failed', error);
        throw error;
    }
}
async function disconnectMongo() {
    if (client) {
        await client.close();
        client = null;
        db = null;
        utils_1.logger.info('MongoDB disconnected');
    }
}
function getDb() {
    if (!db) {
        throw new Error('MongoDB not connected. Call connectMongo first.');
    }
    return db;
}
//# sourceMappingURL=connection.js.map