import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * DomainError base class
 * Based on corekit.foundation.v1.yml (lines 25-28, 135-139)
 *
 * All business validation failures must throw DomainError.
 * No raw framework exceptions should leak to API responses.
 */
export class DomainError extends HttpException {
  public readonly code: string;

  constructor(
    code: string,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super({ code, message }, status);
    this.code = code;
    this.name = 'DomainError';
  }
}

/**
 * Specific domain error types following Foundation rule
 */

export class ValidationError extends DomainError {
  constructor(code: string, message: string = 'Validation failed') {
    super(code, message, HttpStatus.BAD_REQUEST);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends DomainError {
  constructor(code: string, message: string = 'Resource not found') {
    super(code, message, HttpStatus.NOT_FOUND);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends DomainError {
  constructor(code: string, message: string = 'Conflict occurred') {
    super(code, message, HttpStatus.CONFLICT);
    this.name = 'ConflictError';
  }
}

export class ForbiddenError extends DomainError {
  constructor(code: string, message: string = 'Forbidden') {
    super(code, message, HttpStatus.FORBIDDEN);
    this.name = 'ForbiddenError';
  }
}

export class UnauthorizedError extends DomainError {
  constructor(code: string, message: string = 'Unauthorized') {
    super(code, message, HttpStatus.UNAUTHORIZED);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Helper function to ensure error is DomainError
 * Converts unknown errors to DomainError format
 */
export function toDomainError(error: unknown): DomainError {
  if (error instanceof DomainError) {
    return error;
  }

  if (error instanceof Error) {
    return new DomainError(
      'INTERNAL_ERROR',
      error.message,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  return new DomainError(
    'UNKNOWN_ERROR',
    'An unknown error occurred',
    HttpStatus.INTERNAL_SERVER_ERROR,
  );
}
