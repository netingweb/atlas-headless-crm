"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.ConsoleLogger = void 0;
class ConsoleLogger {
    info(message, meta) {
        console.log(`[INFO] ${message}`, meta ? JSON.stringify(meta) : '');
    }
    warn(message, meta) {
        console.warn(`[WARN] ${message}`, meta ? JSON.stringify(meta) : '');
    }
    error(message, error, meta) {
        console.error(`[ERROR] ${message}`, error, meta ? JSON.stringify(meta) : '');
    }
    debug(message, meta) {
        if (process.env.NODE_ENV === 'development') {
            console.debug(`[DEBUG] ${message}`, meta ? JSON.stringify(meta) : '');
        }
    }
}
exports.ConsoleLogger = ConsoleLogger;
exports.logger = new ConsoleLogger();
//# sourceMappingURL=logger.js.map