import { HttpStatus } from '@nestjs/common';
import {
  DomainError,
  ValidationError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
  toDomainError,
} from './errors';

describe('DomainError', () => {
  describe('DomainError base class', () => {
    it('should create error with code, message, and status', () => {
      const error = new DomainError(
        'TEST_ERROR',
        'Test message',
        HttpStatus.BAD_REQUEST,
      );

      expect(error).toBeInstanceOf(DomainError);
      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('Test message');
      expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(error.name).toBe('DomainError');
    });

    it('should default to BAD_REQUEST status', () => {
      const error = new DomainError('TEST_ERROR', 'Test message');

      expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    });

    it('should return proper response format', () => {
      const error = new DomainError('TEST_ERROR', 'Test message');
      const response = error.getResponse();

      expect(response).toEqual({
        code: 'TEST_ERROR',
        message: 'Test message',
      });
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with 400 status', () => {
      const error = new ValidationError('INVALID_INPUT', 'Invalid input');

      expect(error).toBeInstanceOf(ValidationError);
      expect(error).toBeInstanceOf(DomainError);
      expect(error.code).toBe('INVALID_INPUT');
      expect(error.message).toBe('Invalid input');
      expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(error.name).toBe('ValidationError');
    });

    it('should use default message if not provided', () => {
      const error = new ValidationError('INVALID_INPUT');

      expect(error.message).toBe('Validation failed');
    });
  });

  describe('NotFoundError', () => {
    it('should create not found error with 404 status', () => {
      const error = new NotFoundError('RESOURCE_NOT_FOUND', 'Resource not found');

      expect(error).toBeInstanceOf(NotFoundError);
      expect(error).toBeInstanceOf(DomainError);
      expect(error.code).toBe('RESOURCE_NOT_FOUND');
      expect(error.message).toBe('Resource not found');
      expect(error.getStatus()).toBe(HttpStatus.NOT_FOUND);
      expect(error.name).toBe('NotFoundError');
    });

    it('should use default message if not provided', () => {
      const error = new NotFoundError('RESOURCE_NOT_FOUND');

      expect(error.message).toBe('Resource not found');
    });
  });

  describe('ConflictError', () => {
    it('should create conflict error with 409 status', () => {
      const error = new ConflictError('DUPLICATE_ENTRY', 'Duplicate entry');

      expect(error).toBeInstanceOf(ConflictError);
      expect(error).toBeInstanceOf(DomainError);
      expect(error.code).toBe('DUPLICATE_ENTRY');
      expect(error.message).toBe('Duplicate entry');
      expect(error.getStatus()).toBe(HttpStatus.CONFLICT);
      expect(error.name).toBe('ConflictError');
    });

    it('should use default message if not provided', () => {
      const error = new ConflictError('DUPLICATE_ENTRY');

      expect(error.message).toBe('Conflict occurred');
    });
  });

  describe('ForbiddenError', () => {
    it('should create forbidden error with 403 status', () => {
      const error = new ForbiddenError('NO_PERMISSION', 'No permission');

      expect(error).toBeInstanceOf(ForbiddenError);
      expect(error).toBeInstanceOf(DomainError);
      expect(error.code).toBe('NO_PERMISSION');
      expect(error.message).toBe('No permission');
      expect(error.getStatus()).toBe(HttpStatus.FORBIDDEN);
      expect(error.name).toBe('ForbiddenError');
    });

    it('should use default message if not provided', () => {
      const error = new ForbiddenError('NO_PERMISSION');

      expect(error.message).toBe('Forbidden');
    });
  });

  describe('UnauthorizedError', () => {
    it('should create unauthorized error with 401 status', () => {
      const error = new UnauthorizedError('NOT_AUTHENTICATED', 'Not authenticated');

      expect(error).toBeInstanceOf(UnauthorizedError);
      expect(error).toBeInstanceOf(DomainError);
      expect(error.code).toBe('NOT_AUTHENTICATED');
      expect(error.message).toBe('Not authenticated');
      expect(error.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
      expect(error.name).toBe('UnauthorizedError');
    });

    it('should use default message if not provided', () => {
      const error = new UnauthorizedError('NOT_AUTHENTICATED');

      expect(error.message).toBe('Unauthorized');
    });
  });

  describe('toDomainError', () => {
    it('should return DomainError as-is', () => {
      const original = new DomainError('TEST_ERROR', 'Test message');
      const converted = toDomainError(original);

      expect(converted).toBe(original);
    });

    it('should convert Error to DomainError', () => {
      const original = new Error('Test error');
      const converted = toDomainError(original);

      expect(converted).toBeInstanceOf(DomainError);
      expect(converted.code).toBe('INTERNAL_ERROR');
      expect(converted.message).toBe('Test error');
      expect(converted.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('should convert unknown error to DomainError', () => {
      const converted = toDomainError('random string');

      expect(converted).toBeInstanceOf(DomainError);
      expect(converted.code).toBe('UNKNOWN_ERROR');
      expect(converted.message).toBe('An unknown error occurred');
      expect(converted.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('should convert null to DomainError', () => {
      const converted = toDomainError(null);

      expect(converted).toBeInstanceOf(DomainError);
      expect(converted.code).toBe('UNKNOWN_ERROR');
    });
  });
});
