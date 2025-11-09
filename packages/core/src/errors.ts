export class CrmAtlasError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends CrmAtlasError {
  constructor(message: string, code = 'BAD_REQUEST') {
    super(message, code, 400);
  }
}

export class UnauthorizedError extends CrmAtlasError {
  constructor(message: string = 'Unauthorized', code = 'UNAUTHORIZED') {
    super(message, code, 401);
  }
}

export class ForbiddenError extends CrmAtlasError {
  constructor(message: string = 'Forbidden', code = 'FORBIDDEN') {
    super(message, code, 403);
  }
}

export class NotFoundError extends CrmAtlasError {
  constructor(message: string = 'Resource not found', code = 'NOT_FOUND') {
    super(message, code, 404);
  }
}

export class ConflictError extends CrmAtlasError {
  constructor(message: string, code = 'CONFLICT') {
    super(message, code, 409);
  }
}

export class ValidationError extends BadRequestError {
  constructor(
    message: string,
    public readonly errors: Array<{ path: string; message: string }>,
    code = 'VALIDATION_ERROR'
  ) {
    super(message, code);
  }
}
