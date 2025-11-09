"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationError = exports.ConflictError = exports.NotFoundError = exports.ForbiddenError = exports.UnauthorizedError = exports.BadRequestError = exports.CrmAtlasError = void 0;
class CrmAtlasError extends Error {
    code;
    statusCode;
    constructor(message, code, statusCode = 500) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.CrmAtlasError = CrmAtlasError;
class BadRequestError extends CrmAtlasError {
    constructor(message, code = 'BAD_REQUEST') {
        super(message, code, 400);
    }
}
exports.BadRequestError = BadRequestError;
class UnauthorizedError extends CrmAtlasError {
    constructor(message = 'Unauthorized', code = 'UNAUTHORIZED') {
        super(message, code, 401);
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends CrmAtlasError {
    constructor(message = 'Forbidden', code = 'FORBIDDEN') {
        super(message, code, 403);
    }
}
exports.ForbiddenError = ForbiddenError;
class NotFoundError extends CrmAtlasError {
    constructor(message = 'Resource not found', code = 'NOT_FOUND') {
        super(message, code, 404);
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends CrmAtlasError {
    constructor(message, code = 'CONFLICT') {
        super(message, code, 409);
    }
}
exports.ConflictError = ConflictError;
class ValidationError extends BadRequestError {
    errors;
    constructor(message, errors, code = 'VALIDATION_ERROR') {
        super(message, code);
        this.errors = errors;
    }
}
exports.ValidationError = ValidationError;
//# sourceMappingURL=errors.js.map