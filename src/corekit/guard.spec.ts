import { HttpStatus } from '@nestjs/common';
import { Guard } from './guard';
import { DomainError } from './errors';

describe('Guard', () => {
  describe('assert', () => {
    it('should not throw when condition is true', () => {
      expect(() => {
        Guard.assert(true, 'TEST_ERROR', 'Test message');
      }).not.toThrow();
    });

    it('should throw DomainError when condition is false', () => {
      expect(() => {
        Guard.assert(false, 'TEST_ERROR', 'Test message');
      }).toThrow(DomainError);
    });

    it('should throw with correct error code and message', () => {
      try {
        Guard.assert(false, 'TEST_ERROR', 'Test message');
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(DomainError);
        expect((error as DomainError).code).toBe('TEST_ERROR');
        expect((error as DomainError).message).toBe('Test message');
        expect((error as DomainError).getStatus()).toBe(HttpStatus.BAD_REQUEST);
      }
    });

    it('should use custom HTTP status', () => {
      try {
        Guard.assert(false, 'TEST_ERROR', 'Test message', HttpStatus.CONFLICT);
        fail('Should have thrown');
      } catch (error) {
        expect((error as DomainError).getStatus()).toBe(HttpStatus.CONFLICT);
      }
    });
  });

  describe('assertExists', () => {
    it('should not throw when value exists', () => {
      expect(() => {
        Guard.assertExists('value', 'NOT_FOUND');
      }).not.toThrow();

      expect(() => {
        Guard.assertExists(0, 'NOT_FOUND');
      }).not.toThrow();

      expect(() => {
        Guard.assertExists(false, 'NOT_FOUND');
      }).not.toThrow();
    });

    it('should throw when value is null', () => {
      expect(() => {
        Guard.assertExists(null, 'NOT_FOUND', 'Value not found');
      }).toThrow(DomainError);
    });

    it('should throw when value is undefined', () => {
      expect(() => {
        Guard.assertExists(undefined, 'NOT_FOUND', 'Value not found');
      }).toThrow(DomainError);
    });

    it('should throw with 404 status', () => {
      try {
        Guard.assertExists(null, 'NOT_FOUND', 'Value not found');
        fail('Should have thrown');
      } catch (error) {
        expect((error as DomainError).getStatus()).toBe(HttpStatus.NOT_FOUND);
      }
    });
  });

  describe('assertNotExists', () => {
    it('should not throw when value is null', () => {
      expect(() => {
        Guard.assertNotExists(null, 'ALREADY_EXISTS');
      }).not.toThrow();
    });

    it('should not throw when value is undefined', () => {
      expect(() => {
        Guard.assertNotExists(undefined, 'ALREADY_EXISTS');
      }).not.toThrow();
    });

    it('should throw when value exists', () => {
      expect(() => {
        Guard.assertNotExists('value', 'ALREADY_EXISTS', 'Value already exists');
      }).toThrow(DomainError);
    });

    it('should throw with 409 status', () => {
      try {
        Guard.assertNotExists('value', 'ALREADY_EXISTS');
        fail('Should have thrown');
      } catch (error) {
        expect((error as DomainError).getStatus()).toBe(HttpStatus.CONFLICT);
      }
    });
  });

  describe('assertStatusIn', () => {
    it('should not throw when status is in allowed list', () => {
      expect(() => {
        Guard.assertStatusIn('active', ['active', 'inactive'], 'INVALID_STATUS');
      }).not.toThrow();
    });

    it('should throw when status is not in allowed list', () => {
      expect(() => {
        Guard.assertStatusIn('deleted', ['active', 'inactive'], 'INVALID_STATUS');
      }).toThrow(DomainError);
    });

    it('should include allowed statuses in error message', () => {
      try {
        Guard.assertStatusIn('deleted', ['active', 'inactive'], 'INVALID_STATUS');
        fail('Should have thrown');
      } catch (error) {
        expect((error as DomainError).message).toContain('active, inactive');
        expect((error as DomainError).message).toContain('deleted');
      }
    });

    it('should use custom error message if provided', () => {
      try {
        Guard.assertStatusIn('deleted', ['active'], 'INVALID_STATUS', 'Custom message');
        fail('Should have thrown');
      } catch (error) {
        expect((error as DomainError).message).toBe('Custom message');
      }
    });
  });

  describe('assertEquals', () => {
    it('should not throw when values are equal', () => {
      expect(() => {
        Guard.assertEquals(5, 5, 'NOT_EQUAL');
      }).not.toThrow();

      expect(() => {
        Guard.assertEquals('test', 'test', 'NOT_EQUAL');
      }).not.toThrow();
    });

    it('should throw when values are not equal', () => {
      expect(() => {
        Guard.assertEquals(5, 10, 'NOT_EQUAL');
      }).toThrow(DomainError);
    });

    it('should include expected and actual values in message', () => {
      try {
        Guard.assertEquals(5, 10, 'NOT_EQUAL');
        fail('Should have thrown');
      } catch (error) {
        expect((error as DomainError).message).toContain('10');
        expect((error as DomainError).message).toContain('5');
      }
    });
  });

  describe('assertGreaterThan', () => {
    it('should not throw when value is greater', () => {
      expect(() => {
        Guard.assertGreaterThan(10, 5, 'TOO_SMALL');
      }).not.toThrow();
    });

    it('should throw when value is equal', () => {
      expect(() => {
        Guard.assertGreaterThan(5, 5, 'TOO_SMALL');
      }).toThrow(DomainError);
    });

    it('should throw when value is less', () => {
      expect(() => {
        Guard.assertGreaterThan(3, 5, 'TOO_SMALL');
      }).toThrow(DomainError);
    });
  });

  describe('assertGreaterThanOrEqual', () => {
    it('should not throw when value is greater', () => {
      expect(() => {
        Guard.assertGreaterThanOrEqual(10, 5, 'TOO_SMALL');
      }).not.toThrow();
    });

    it('should not throw when value is equal', () => {
      expect(() => {
        Guard.assertGreaterThanOrEqual(5, 5, 'TOO_SMALL');
      }).not.toThrow();
    });

    it('should throw when value is less', () => {
      expect(() => {
        Guard.assertGreaterThanOrEqual(3, 5, 'TOO_SMALL');
      }).toThrow(DomainError);
    });
  });

  describe('assertLessThan', () => {
    it('should not throw when value is less', () => {
      expect(() => {
        Guard.assertLessThan(3, 5, 'TOO_LARGE');
      }).not.toThrow();
    });

    it('should throw when value is equal', () => {
      expect(() => {
        Guard.assertLessThan(5, 5, 'TOO_LARGE');
      }).toThrow(DomainError);
    });

    it('should throw when value is greater', () => {
      expect(() => {
        Guard.assertLessThan(10, 5, 'TOO_LARGE');
      }).toThrow(DomainError);
    });
  });

  describe('assertLength', () => {
    it('should not throw when length is within range', () => {
      expect(() => {
        Guard.assertLength('hello', 3, 10, 'INVALID_LENGTH');
      }).not.toThrow();

      expect(() => {
        Guard.assertLength('hello', 5, 5, 'INVALID_LENGTH');
      }).not.toThrow();
    });

    it('should throw when length is too short', () => {
      expect(() => {
        Guard.assertLength('hi', 3, 10, 'INVALID_LENGTH');
      }).toThrow(DomainError);
    });

    it('should throw when length is too long', () => {
      expect(() => {
        Guard.assertLength('hello world!!!', 3, 10, 'INVALID_LENGTH');
      }).toThrow(DomainError);
    });
  });

  describe('assertNotEmpty', () => {
    it('should not throw when array has items', () => {
      expect(() => {
        Guard.assertNotEmpty([1, 2, 3], 'EMPTY_ARRAY');
      }).not.toThrow();
    });

    it('should throw when array is empty', () => {
      expect(() => {
        Guard.assertNotEmpty([], 'EMPTY_ARRAY');
      }).toThrow(DomainError);
    });

    it('should throw when array is null', () => {
      expect(() => {
        Guard.assertNotEmpty(null as any, 'EMPTY_ARRAY');
      }).toThrow(DomainError);
    });

    it('should throw when array is undefined', () => {
      expect(() => {
        Guard.assertNotEmpty(undefined as any, 'EMPTY_ARRAY');
      }).toThrow(DomainError);
    });
  });

  describe('assertPermission', () => {
    it('should not throw when has permission', () => {
      expect(() => {
        Guard.assertPermission(true);
      }).not.toThrow();
    });

    it('should throw when no permission', () => {
      expect(() => {
        Guard.assertPermission(false);
      }).toThrow(DomainError);
    });

    it('should throw with 403 status', () => {
      try {
        Guard.assertPermission(false);
        fail('Should have thrown');
      } catch (error) {
        expect((error as DomainError).getStatus()).toBe(HttpStatus.FORBIDDEN);
      }
    });

    it('should use custom error code', () => {
      try {
        Guard.assertPermission(false, 'NO_ACCESS');
        fail('Should have thrown');
      } catch (error) {
        expect((error as DomainError).code).toBe('NO_ACCESS');
      }
    });
  });
});
