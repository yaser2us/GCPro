import { DomainError } from './errors';
import { HttpStatus } from '@nestjs/common';

/**
 * Guard utility for enforcing business conditions
 * Based on corekit.foundation.v1.yml (lines 30-33, 97-101)
 *
 * Guards enforce business conditions and must NOT use runtime eval.
 * All guards are compiled at codegen time.
 */

/**
 * Guard configuration
 */
export interface GuardConfig {
  expr: string; // Expression description (for documentation)
  errorCode: string; // Error code if guard fails
  errorMessage?: string; // Optional error message
  httpStatus?: HttpStatus; // Optional HTTP status (default: 400)
}

/**
 * Guard utility class
 */
export class Guard {
  /**
   * Assert a condition is true, throw DomainError if false
   *
   * @param condition Boolean condition to check
   * @param errorCode Error code if condition is false
   * @param errorMessage Optional error message
   * @param httpStatus Optional HTTP status (default: BAD_REQUEST)
   */
  static assert(
    condition: boolean,
    errorCode: string,
    errorMessage: string = 'Guard condition failed',
    httpStatus: HttpStatus = HttpStatus.BAD_REQUEST,
  ): void {
    if (!condition) {
      throw new DomainError(errorCode, errorMessage, httpStatus);
    }
  }

  /**
   * Assert value is not null/undefined
   */
  static assertExists<T>(
    value: T | null | undefined,
    errorCode: string,
    errorMessage: string = 'Required value not found',
  ): asserts value is T {
    if (value === null || value === undefined) {
      throw new DomainError(errorCode, errorMessage, HttpStatus.NOT_FOUND);
    }
  }

  /**
   * Assert value is null/undefined
   */
  static assertNotExists(
    value: any,
    errorCode: string,
    errorMessage: string = 'Value already exists',
  ): void {
    if (value !== null && value !== undefined) {
      throw new DomainError(errorCode, errorMessage, HttpStatus.CONFLICT);
    }
  }

  /**
   * Assert status is in allowed list
   */
  static assertStatusIn(
    actualStatus: string,
    allowedStatuses: string[],
    errorCode: string,
    errorMessage?: string,
  ): void {
    if (!allowedStatuses.includes(actualStatus)) {
      const message =
        errorMessage ||
        `Status '${actualStatus}' not in allowed list: ${allowedStatuses.join(', ')}`;
      throw new DomainError(errorCode, message, HttpStatus.CONFLICT);
    }
  }

  /**
   * Assert two values are equal
   */
  static assertEquals<T>(
    actual: T,
    expected: T,
    errorCode: string,
    errorMessage?: string,
  ): void {
    if (actual !== expected) {
      const message =
        errorMessage || `Expected '${expected}' but got '${actual}'`;
      throw new DomainError(errorCode, message, HttpStatus.CONFLICT);
    }
  }

  /**
   * Assert value is greater than minimum
   */
  static assertGreaterThan(
    value: number,
    min: number,
    errorCode: string,
    errorMessage?: string,
  ): void {
    if (value <= min) {
      const message = errorMessage || `Value ${value} must be greater than ${min}`;
      throw new DomainError(errorCode, message, HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Assert value is greater than or equal to minimum
   */
  static assertGreaterThanOrEqual(
    value: number,
    min: number,
    errorCode: string,
    errorMessage?: string,
  ): void {
    if (value < min) {
      const message =
        errorMessage || `Value ${value} must be greater than or equal to ${min}`;
      throw new DomainError(errorCode, message, HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Assert value is less than maximum
   */
  static assertLessThan(
    value: number,
    max: number,
    errorCode: string,
    errorMessage?: string,
  ): void {
    if (value >= max) {
      const message = errorMessage || `Value ${value} must be less than ${max}`;
      throw new DomainError(errorCode, message, HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Assert string length is within range
   */
  static assertLength(
    value: string,
    min: number,
    max: number,
    errorCode: string,
    errorMessage?: string,
  ): void {
    if (value.length < min || value.length > max) {
      const message =
        errorMessage ||
        `String length ${value.length} must be between ${min} and ${max}`;
      throw new DomainError(errorCode, message, HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Assert array is not empty
   */
  static assertNotEmpty<T>(
    array: T[],
    errorCode: string,
    errorMessage: string = 'Array must not be empty',
  ): void {
    if (!array || array.length === 0) {
      throw new DomainError(errorCode, errorMessage, HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Assert user has permission
   */
  static assertPermission(
    hasPermission: boolean,
    errorCode: string = 'FORBIDDEN',
    errorMessage: string = 'You do not have permission to perform this action',
  ): void {
    if (!hasPermission) {
      throw new DomainError(errorCode, errorMessage, HttpStatus.FORBIDDEN);
    }
  }
}
