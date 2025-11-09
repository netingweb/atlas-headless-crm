import {
  CrmAtlasError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
} from './errors';

describe('Errors', () => {
  describe('CrmAtlasError', () => {
    it('should create error with message, code and statusCode', () => {
      const error = new CrmAtlasError('Test error', 'TEST_CODE', 400);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('CrmAtlasError');
    });

    it('should default statusCode to 500', () => {
      const error = new CrmAtlasError('Test error', 'TEST_CODE');
      expect(error.statusCode).toBe(500);
    });
  });

  describe('BadRequestError', () => {
    it('should create error with 400 status code', () => {
      const error = new BadRequestError('Bad request');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('BAD_REQUEST');
    });
  });

  describe('UnauthorizedError', () => {
    it('should create error with 401 status code and default message', () => {
      const error = new UnauthorizedError();
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Unauthorized');
      expect(error.code).toBe('UNAUTHORIZED');
    });

    it('should allow custom message', () => {
      const error = new UnauthorizedError('Custom message');
      expect(error.message).toBe('Custom message');
    });
  });

  describe('ForbiddenError', () => {
    it('should create error with 403 status code', () => {
      const error = new ForbiddenError();
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
    });
  });

  describe('NotFoundError', () => {
    it('should create error with 404 status code', () => {
      const error = new NotFoundError();
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });
  });

  describe('ConflictError', () => {
    it('should create error with 409 status code', () => {
      const error = new ConflictError('Conflict');
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
    });
  });

  describe('ValidationError', () => {
    it('should create error with validation errors', () => {
      const errors = [
        { path: 'email', message: 'Invalid email' },
        { path: 'name', message: 'Name is required' },
      ];
      const error = new ValidationError('Validation failed', errors);
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.errors).toEqual(errors);
    });
  });
});
