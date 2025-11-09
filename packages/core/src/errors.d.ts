export declare class CrmAtlasError extends Error {
  readonly code: string;
  readonly statusCode: number;
  constructor(message: string, code: string, statusCode?: number);
}
export declare class BadRequestError extends CrmAtlasError {
  constructor(message: string, code?: string);
}
export declare class UnauthorizedError extends CrmAtlasError {
  constructor(message?: string, code?: string);
}
export declare class ForbiddenError extends CrmAtlasError {
  constructor(message?: string, code?: string);
}
export declare class NotFoundError extends CrmAtlasError {
  constructor(message?: string, code?: string);
}
export declare class ConflictError extends CrmAtlasError {
  constructor(message: string, code?: string);
}
export declare class ValidationError extends BadRequestError {
  readonly errors: Array<{
    path: string;
    message: string;
  }>;
  constructor(
    message: string,
    errors: Array<{
      path: string;
      message: string;
    }>,
    code?: string
  );
}
//# sourceMappingURL=errors.d.ts.map
