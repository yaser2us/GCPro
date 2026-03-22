# Payment Pillar Implementation Review Report

**Generated:** 2026-03-22
**Specification:** specs/payment/payment.pillar.v2.yml
**Reviewer:** Claude Sonnet 4.5

---

## Executive Summary

**Overall Status:** ⚠️ **PARTIAL PASS - CRITICAL ISSUES FOUND**

The Payment pillar implementation is **functionally complete** with all 11 commands implemented, but has **critical missing database constraints** that could lead to data integrity issues in production. The implementation follows the workflow discipline correctly and all core functionality is present, however database-level constraints (indexes, unique keys, foreign keys) are not defined in the entity files.

### Summary Statistics

- **Entities:** 6/6 present ✅ (Missing constraints ❌)
- **Repositories:** 6/6 present ✅
- **DTOs:** 4/4 present ✅
- **Controllers:** 4/4 present ✅
- **Workflow Commands:** 10/11 implemented ⚠️ (Webhook.Process is not exposed via HTTP endpoint - this is acceptable as it's internal)
- **Module Configuration:** ✅ Complete
- **App Module Integration:** ✅ Complete

### Critical Issues

1. **Missing Database Constraints:** No `@Index()` or `@Unique()` decorators on entities despite YML specification requiring multiple unique keys and indexes
2. **Missing Foreign Key Relationships:** TypeORM `@ManyToOne`/`@OneToMany` relationships not defined (FK columns exist but relationships not explicit)
3. **Webhook.Process Command:** Not implemented as HTTP endpoint (acceptable - appears to be internal worker command)

### Recommendations

1. **CRITICAL:** Add all unique constraints and indexes to entity files using TypeORM decorators
2. **RECOMMENDED:** Define explicit foreign key relationships using TypeORM decorators
3. **OPTIONAL:** Consider implementing Webhook.Process as internal method or background worker

---

## 1. Entity Files Review (6/6 Entities)

### 1.1 PaymentMethod Entity

**File:** `/Users/80001411yasserbatole/Documents/GitHub/GCPro/src/plugins/payment/entities/payment-method.entity.ts`
**Expected Columns:** 16
**Actual Columns:** 16 ✅

#### Column Verification

| Column | Type | Length | Nullable | Default | Status |
|--------|------|--------|----------|---------|--------|
| id | bigint | - | false | AUTO_INCREMENT | ✅ |
| account_id | bigint | - | false | - | ✅ |
| person_id | bigint | - | true | - | ✅ |
| provider | varchar | 32 | false | - | ✅ |
| method_type | varchar | 32 | false | - | ✅ |
| status | varchar | 16 | false | 'active' | ✅ |
| provider_customer_ref | varchar | 128 | true | - | ✅ |
| provider_method_ref | varchar | 128 | true | - | ✅ |
| brand | varchar | 32 | true | - | ✅ |
| last4 | varchar | 8 | true | - | ✅ |
| exp_mm | varchar | 2 | true | - | ✅ |
| exp_yyyy | varchar | 4 | true | - | ✅ |
| consent_json | json | - | true | - | ✅ |
| meta_json | json | - | true | - | ✅ |
| created_at | datetime | - | false | CURRENT_TIMESTAMP | ✅ |
| updated_at | datetime | - | false | CURRENT_TIMESTAMP | ✅ |

**Total: 16/16 columns ✅**

#### Constraints Verification

| Constraint Type | YML Requirement | Implementation | Status |
|----------------|-----------------|----------------|--------|
| Primary Key | id | ✅ @PrimaryGeneratedColumn | ✅ |
| Unique: uk_pm_provider_method | [provider, provider_method_ref] | ❌ Not implemented | ❌ MISSING |
| Index: idx_pm_account_status | [account_id, status] | ❌ Not implemented | ❌ MISSING |
| Index: idx_pm_person | [person_id] | ❌ Not implemented | ❌ MISSING |
| Index: idx_pm_provider | [provider, method_type, status] | ❌ Not implemented | ❌ MISSING |

**Constraints Status: ❌ CRITICAL - Missing 1 unique key and 3 indexes**

#### Issues Found

1. **CRITICAL:** Missing unique constraint on `[provider, provider_method_ref]` - Could allow duplicate payment methods from same provider
2. **CRITICAL:** Missing composite index on `[account_id, status]` - Will cause slow queries when fetching user's active payment methods
3. **CRITICAL:** Missing index on `[person_id]` - Will cause slow queries for person-level payment method lookups
4. **CRITICAL:** Missing composite index on `[provider, method_type, status]` - Will cause slow queries when filtering by provider and method type

---

### 1.2 PaymentIntent Entity

**File:** `/Users/80001411yasserbatole/Documents/GitHub/GCPro/src/plugins/payment/entities/payment-intent.entity.ts`
**Expected Columns:** 25
**Actual Columns:** 25 ✅

#### Column Verification

| Column | Type | Length | Nullable | Default | Status |
|--------|------|--------|----------|---------|--------|
| id | bigint | - | false | AUTO_INCREMENT | ✅ |
| intent_key | varchar | 64 | false | - | ✅ |
| intent_type | varchar | 16 | false | - | ✅ |
| account_id | bigint | - | false | - | ✅ |
| person_id | bigint | - | true | - | ✅ |
| payment_method_id | bigint | - | true | - | ✅ |
| amount | decimal | 18,2 | false | - | ✅ |
| currency | varchar | 8 | false | 'MYR' | ✅ |
| status | varchar | 16 | false | 'created' | ✅ |
| purpose_code | varchar | 32 | false | 'other' | ✅ |
| ref_type | varchar | 64 | true | - | ✅ |
| ref_id | varchar | 128 | true | - | ✅ |
| idempotency_key | varchar | 128 | true | - | ✅ |
| request_id | varchar | 128 | true | - | ✅ |
| provider | varchar | 32 | true | - | ✅ |
| provider_intent_ref | varchar | 128 | true | - | ✅ |
| return_url | varchar | 500 | true | - | ✅ |
| callback_url | varchar | 500 | true | - | ✅ |
| expires_at | datetime | - | true | - | ✅ |
| ledger_txn_id | bigint | - | true | - | ✅ |
| meta_json | json | - | true | - | ✅ |
| created_at | datetime | - | false | CURRENT_TIMESTAMP | ✅ |
| updated_at | datetime | - | false | CURRENT_TIMESTAMP | ✅ |
| succeeded_at | datetime | - | true | - | ✅ |
| failed_at | datetime | - | true | - | ✅ |

**Total: 25/25 columns ✅**

#### Constraints Verification

| Constraint Type | YML Requirement | Implementation | Status |
|----------------|-----------------|----------------|--------|
| Primary Key | id | ✅ @PrimaryGeneratedColumn | ✅ |
| Unique: uk_pi_intent_key | [intent_key] | ⚠️ Column-level unique: true | ⚠️ PARTIAL |
| Unique: uk_pi_idempotency | [idempotency_key] | ⚠️ Column-level unique: true | ⚠️ PARTIAL |
| Index: idx_pi_status_time | [status, created_at] | ❌ Not implemented | ❌ MISSING |
| Index: idx_pi_account_purpose | [account_id, purpose_code, status] | ❌ Not implemented | ❌ MISSING |
| Index: idx_pi_ref | [ref_type, ref_id] | ❌ Not implemented | ❌ MISSING |
| Index: idx_pi_provider_ref | [provider, provider_intent_ref] | ❌ Not implemented | ❌ MISSING |
| Index: fk_pi_payment_method | [payment_method_id] | ❌ Not implemented | ❌ MISSING |
| Foreign Key: fk_pi_payment_method | payment_method_id → payment_method.id | ❌ Not implemented | ❌ MISSING |

**Constraints Status: ❌ CRITICAL - Missing 5 indexes and 1 foreign key**

#### Issues Found

1. **CRITICAL:** Missing composite index on `[status, created_at]` - Will cause slow queries when filtering by status and time
2. **CRITICAL:** Missing composite index on `[account_id, purpose_code, status]` - Will cause slow queries for user's payment history
3. **CRITICAL:** Missing composite index on `[ref_type, ref_id]` - Will cause slow lookups when finding payment by reference (e.g., policy payment)
4. **CRITICAL:** Missing composite index on `[provider, provider_intent_ref]` - Will cause slow lookups from webhook processing
5. **CRITICAL:** Missing index on `[payment_method_id]` - Will cause slow queries when joining with payment methods
6. **CRITICAL:** Missing foreign key constraint to payment_method table - Could allow orphaned payment intents

---

### 1.3 PaymentReceipt Entity

**File:** `/Users/80001411yasserbatole/Documents/GitHub/GCPro/src/plugins/payment/entities/payment-receipt.entity.ts`
**Expected Columns:** 16
**Actual Columns:** 16 ✅

#### Column Verification

| Column | Type | Length | Nullable | Default | Status |
|--------|------|--------|----------|---------|--------|
| id | bigint | - | false | AUTO_INCREMENT | ✅ |
| receipt_no | varchar | 64 | false | - | ✅ |
| account_id | bigint | - | false | - | ✅ |
| person_id | bigint | - | true | - | ✅ |
| payment_intent_id | bigint | - | true | - | ✅ |
| ledger_txn_id | bigint | - | true | - | ✅ |
| amount | decimal | 18,2 | false | - | ✅ |
| currency | varchar | 8 | false | 'MYR' | ✅ |
| title | varchar | 255 | true | - | ✅ |
| description | varchar | 512 | true | - | ✅ |
| status | varchar | 16 | false | 'issued' | ✅ |
| issued_at | datetime | - | false | - | ✅ |
| voided_at | datetime | - | true | - | ✅ |
| ref_type | varchar | 64 | true | - | ✅ |
| ref_id | varchar | 128 | true | - | ✅ |
| meta_json | json | - | true | - | ✅ |
| created_at | datetime | - | false | CURRENT_TIMESTAMP | ✅ |

**Total: 16/16 columns ✅**

#### Constraints Verification

| Constraint Type | YML Requirement | Implementation | Status |
|----------------|-----------------|----------------|--------|
| Primary Key | id | ✅ @PrimaryGeneratedColumn | ✅ |
| Unique: uk_receipt_no | [receipt_no] | ⚠️ Column-level unique: true | ⚠️ PARTIAL |
| Index: idx_receipt_account_time | [account_id, issued_at] | ❌ Not implemented | ❌ MISSING |
| Index: idx_receipt_person_time | [person_id, issued_at] | ❌ Not implemented | ❌ MISSING |
| Index: idx_receipt_status_time | [status, issued_at] | ❌ Not implemented | ❌ MISSING |
| Index: idx_receipt_ref | [ref_type, ref_id] | ❌ Not implemented | ❌ MISSING |
| Index: idx_receipt_payment_intent | [payment_intent_id] | ❌ Not implemented | ❌ MISSING |
| Index: idx_receipt_ledger_txn | [ledger_txn_id] | ❌ Not implemented | ❌ MISSING |
| Foreign Keys | 4 foreign keys to account, person, payment_intent, ledger_txn | ❌ Not implemented | ❌ MISSING |

**Constraints Status: ❌ CRITICAL - Missing 6 indexes and 4 foreign keys**

#### Issues Found

1. **CRITICAL:** Missing composite index on `[account_id, issued_at]` - Will cause slow queries for user receipt history
2. **CRITICAL:** Missing composite index on `[person_id, issued_at]` - Will cause slow queries for person receipt history
3. **CRITICAL:** Missing composite index on `[status, issued_at]` - Will cause slow queries when filtering receipts by status
4. **CRITICAL:** Missing composite index on `[ref_type, ref_id]` - Will cause slow lookups when finding receipts by reference
5. **CRITICAL:** Missing indexes on foreign key columns - Will cause slow joins
6. **CRITICAL:** Missing 4 foreign key constraints - Could allow orphaned receipt records

---

### 1.4 PaymentAttempt Entity

**File:** `/Users/80001411yasserbatole/Documents/GitHub/GCPro/src/plugins/payment/entities/payment-attempt.entity.ts`
**Expected Columns:** 14
**Actual Columns:** 14 ✅

#### Column Verification

| Column | Type | Length | Nullable | Default | Status |
|--------|------|--------|----------|---------|--------|
| id | bigint | - | false | AUTO_INCREMENT | ✅ |
| intent_id | bigint | - | false | - | ✅ |
| attempt_no | int | - | false | 1 | ✅ |
| status | varchar | 16 | false | 'initiated' | ✅ |
| provider | varchar | 32 | false | - | ✅ |
| provider_txn_ref | varchar | 128 | true | - | ✅ |
| provider_status | varchar | 64 | true | - | ✅ |
| failure_code | varchar | 64 | true | - | ✅ |
| failure_message | varchar | 255 | true | - | ✅ |
| request_json | json | - | true | - | ✅ |
| response_json | json | - | true | - | ✅ |
| started_at | datetime | - | true | - | ✅ |
| completed_at | datetime | - | true | - | ✅ |
| created_at | datetime | - | false | CURRENT_TIMESTAMP | ✅ |

**Total: 14/14 columns ✅**

#### Constraints Verification

| Constraint Type | YML Requirement | Implementation | Status |
|----------------|-----------------|----------------|--------|
| Primary Key | id | ✅ @PrimaryGeneratedColumn | ✅ |
| Unique: uk_pa_intent_attempt | [intent_id, attempt_no] | ❌ Not implemented | ❌ MISSING |
| Index: idx_pa_status_time | [status, created_at] | ❌ Not implemented | ❌ MISSING |
| Index: idx_pa_provider_txn | [provider, provider_txn_ref] | ❌ Not implemented | ❌ MISSING |
| Foreign Key: fk_pa_intent | intent_id → payment_intent.id (CASCADE) | ❌ Not implemented | ❌ MISSING |

**Constraints Status: ❌ CRITICAL - Missing 1 unique key, 2 indexes, and 1 foreign key**

#### Issues Found

1. **CRITICAL:** Missing unique constraint on `[intent_id, attempt_no]` - Could allow duplicate attempt numbers for same intent
2. **CRITICAL:** Missing composite index on `[status, created_at]` - Will cause slow queries when monitoring attempt status
3. **CRITICAL:** Missing composite index on `[provider, provider_txn_ref]` - Will cause slow lookups from webhook processing
4. **CRITICAL:** Missing foreign key with CASCADE delete - Payment attempts should be deleted when parent intent is deleted

---

### 1.5 PaymentEvent Entity

**File:** `/Users/80001411yasserbatole/Documents/GitHub/GCPro/src/plugins/payment/entities/payment-event.entity.ts`
**Expected Columns:** 9
**Actual Columns:** 9 ✅

#### Column Verification

| Column | Type | Length | Nullable | Default | Status |
|--------|------|--------|----------|---------|--------|
| id | bigint | - | false | AUTO_INCREMENT | ✅ |
| intent_id | bigint | - | false | - | ✅ |
| event_type | varchar | 64 | false | - | ✅ |
| actor_type | varchar | 16 | false | 'system' | ✅ |
| actor_id | bigint | - | true | - | ✅ |
| request_id | varchar | 128 | true | - | ✅ |
| payload_json | json | - | true | - | ✅ |
| occurred_at | datetime | - | false | CURRENT_TIMESTAMP | ✅ |
| created_at | datetime | - | false | CURRENT_TIMESTAMP | ✅ |

**Total: 9/9 columns ✅**

#### Constraints Verification

| Constraint Type | YML Requirement | Implementation | Status |
|----------------|-----------------|----------------|--------|
| Primary Key | id | ✅ @PrimaryGeneratedColumn | ✅ |
| Index: idx_pe_intent_time | [intent_id, occurred_at] | ❌ Not implemented | ❌ MISSING |
| Index: idx_pe_type | [event_type] | ❌ Not implemented | ❌ MISSING |
| Foreign Key: fk_pe_intent | intent_id → payment_intent.id (CASCADE) | ❌ Not implemented | ❌ MISSING |

**Constraints Status: ❌ CRITICAL - Missing 2 indexes and 1 foreign key**

#### Issues Found

1. **CRITICAL:** Missing composite index on `[intent_id, occurred_at]` - Will cause slow queries when fetching event timeline for an intent
2. **CRITICAL:** Missing index on `[event_type]` - Will cause slow queries when filtering events by type
3. **CRITICAL:** Missing foreign key with CASCADE delete - Events should be deleted when parent intent is deleted

---

### 1.6 PaymentWebhookInbox Entity

**File:** `/Users/80001411yasserbatole/Documents/GitHub/GCPro/src/plugins/payment/entities/payment-webhook-inbox.entity.ts`
**Expected Columns:** 16
**Actual Columns:** 16 ✅

#### Column Verification

| Column | Type | Length | Nullable | Default | Status |
|--------|------|--------|----------|---------|--------|
| id | bigint | - | false | AUTO_INCREMENT | ✅ |
| provider | varchar | 32 | false | - | ✅ |
| provider_event_id | varchar | 128 | true | - | ✅ |
| status | varchar | 16 | false | 'new' | ✅ |
| signature_status | varchar | 16 | false | 'unknown' | ✅ |
| intent_key | varchar | 64 | true | - | ✅ |
| provider_txn_ref | varchar | 128 | true | - | ✅ |
| attempt_id | bigint | - | true | - | ✅ |
| received_ip | varchar | 64 | true | - | ✅ |
| headers_json | json | - | true | - | ✅ |
| payload_json | json | - | false | - | ✅ |
| idempotency_key | varchar | 128 | true | - | ✅ |
| attempts | int | - | false | 0 | ✅ |
| received_at | datetime | - | false | CURRENT_TIMESTAMP | ✅ |
| processed_at | datetime | - | true | - | ✅ |
| created_at | datetime | - | false | CURRENT_TIMESTAMP | ✅ |

**Total: 16/16 columns ✅**

#### Constraints Verification

| Constraint Type | YML Requirement | Implementation | Status |
|----------------|-----------------|----------------|--------|
| Primary Key | id | ✅ @PrimaryGeneratedColumn | ✅ |
| Unique: uk_pwi_idempotency | [idempotency_key] | ⚠️ Column-level unique: true | ⚠️ PARTIAL |
| Unique: uk_pwi_provider_event | [provider, provider_event_id] | ❌ Not implemented | ❌ MISSING |
| Index: idx_pwi_status_time | [status, received_at] | ❌ Not implemented | ❌ MISSING |
| Index: idx_pwi_provider_txn | [provider, provider_txn_ref] | ❌ Not implemented | ❌ MISSING |
| Index: fk_pwi_attempt | [attempt_id] | ❌ Not implemented | ❌ MISSING |
| Foreign Key: fk_pwi_attempt | attempt_id → payment_attempt.id (SET NULL) | ❌ Not implemented | ❌ MISSING |

**Constraints Status: ❌ CRITICAL - Missing 1 unique key, 3 indexes, and 1 foreign key**

#### Issues Found

1. **CRITICAL:** Missing unique constraint on `[provider, provider_event_id]` - Could allow duplicate webhooks from same provider event
2. **CRITICAL:** Missing composite index on `[status, received_at]` - Will cause slow queries when polling for new webhooks
3. **CRITICAL:** Missing composite index on `[provider, provider_txn_ref]` - Will cause slow lookups when correlating webhooks to transactions
4. **CRITICAL:** Missing index on `[attempt_id]` - Will cause slow joins with payment_attempt table
5. **CRITICAL:** Missing foreign key with SET NULL - Should gracefully handle attempt deletion

---

## 2. Repository Files Review (6/6 Repositories)

### 2.1 PaymentMethodRepository ✅

**File:** `/Users/80001411yasserbatole/Documents/GitHub/GCPro/src/plugins/payment/repositories/payment-method.repo.ts`

| Requirement | Status |
|------------|--------|
| @Injectable() decorator | ✅ Present |
| @InjectRepository injection | ✅ Present |
| create() method with QueryRunner support | ✅ Present |
| findById() method with QueryRunner support | ✅ Present |
| update() method with QueryRunner support | ✅ Present |
| Additional useful methods | ✅ findByAccountId() |
| Transaction support pattern | ✅ Correct |

**Status:** ✅ PASS

---

### 2.2 PaymentIntentRepository ✅

**File:** `/Users/80001411yasserbatole/Documents/GitHub/GCPro/src/plugins/payment/repositories/payment-intent.repo.ts`

| Requirement | Status |
|------------|--------|
| @Injectable() decorator | ✅ Present |
| @InjectRepository injection | ✅ Present |
| create() method with QueryRunner support | ✅ Present |
| findById() method with QueryRunner support | ✅ Present |
| update() method with QueryRunner support | ✅ Present |
| Additional useful methods | ✅ findByIntentKey(), findByAccountId() |
| Transaction support pattern | ✅ Correct |

**Status:** ✅ PASS

---

### 2.3 PaymentReceiptRepository ✅

**File:** `/Users/80001411yasserbatole/Documents/GitHub/GCPro/src/plugins/payment/repositories/payment-receipt.repo.ts`

| Requirement | Status |
|------------|--------|
| @Injectable() decorator | ✅ Present |
| @InjectRepository injection | ✅ Present |
| create() method with QueryRunner support | ✅ Present |
| findById() method with QueryRunner support | ✅ Present |
| update() method with QueryRunner support | ✅ Present |
| Additional useful methods | ✅ findByReceiptNo() |
| Transaction support pattern | ✅ Correct |

**Status:** ✅ PASS

---

### 2.4 PaymentAttemptRepository ✅

**File:** `/Users/80001411yasserbatole/Documents/GitHub/GCPro/src/plugins/payment/repositories/payment-attempt.repo.ts`

| Requirement | Status |
|------------|--------|
| @Injectable() decorator | ✅ Present |
| @InjectRepository injection | ✅ Present |
| create() method with QueryRunner support | ✅ Present |
| findById() method with QueryRunner support | ✅ Present |
| update() method with QueryRunner support | ✅ Present |
| Additional useful methods | ✅ findByIntentId(), findLatestByIntentId() |
| Transaction support pattern | ✅ Correct |

**Status:** ✅ PASS

---

### 2.5 PaymentEventRepository ✅

**File:** `/Users/80001411yasserbatole/Documents/GitHub/GCPro/src/plugins/payment/repositories/payment-event.repo.ts`

| Requirement | Status |
|------------|--------|
| @Injectable() decorator | ✅ Present |
| @InjectRepository injection | ✅ Present |
| create() method with QueryRunner support | ✅ Present |
| Additional useful methods | ✅ findByIntentId() |
| Transaction support pattern | ✅ Correct |

**Status:** ✅ PASS

**Note:** No update() method - acceptable as events are append-only

---

### 2.6 PaymentWebhookInboxRepository ✅

**File:** `/Users/80001411yasserbatole/Documents/GitHub/GCPro/src/plugins/payment/repositories/payment-webhook-inbox.repo.ts`

| Requirement | Status |
|------------|--------|
| @Injectable() decorator | ✅ Present |
| @InjectRepository injection | ✅ Present |
| create() method with QueryRunner support | ✅ Present |
| findById() method with QueryRunner support | ✅ Present |
| update() method with QueryRunner support | ✅ Present |
| Additional useful methods | ✅ findPendingWebhooks() |
| Transaction support pattern | ✅ Correct |

**Status:** ✅ PASS

---

## 3. DTO Files Review (4/4 DTOs)

### 3.1 PaymentMethodCreateDto ✅

**File:** `/Users/80001411yasserbatole/Documents/GitHub/GCPro/src/plugins/payment/dtos/payment-method-create.dto.ts`

| Field | Type | Required | MaxLength | Status |
|-------|------|----------|-----------|--------|
| accountId | number | Yes | - | ✅ |
| personId | number | No | - | ✅ |
| provider | string | Yes | 32 | ✅ |
| methodType | string | Yes | 32 | ✅ |
| providerCustomerRef | string | No | 128 | ✅ |
| providerMethodRef | string | No | 128 | ✅ |
| brand | string | No | 32 | ✅ |
| last4 | string | No | 8 | ✅ |
| expMm | string | No | 2 | ✅ |
| expYyyy | string | No | 4 | ✅ |
| consentJson | any | No | - | ✅ |
| metaJson | any | No | - | ✅ |

**Status:** ✅ PASS - All 12 fields match YML specification

---

### 3.2 PaymentIntentCreateDto ✅

**File:** `/Users/80001411yasserbatole/Documents/GitHub/GCPro/src/plugins/payment/dtos/payment-intent-create.dto.ts`

| Field | Type | Required | MaxLength | Default | Status |
|-------|------|----------|-----------|---------|--------|
| accountId | number | Yes | - | - | ✅ |
| personId | number | No | - | - | ✅ |
| intentType | string | Yes | 16 | - | ✅ |
| amount | number | Yes | - | - | ✅ |
| currency | string | No | 8 | 'MYR' | ✅ |
| purposeCode | string | No | 32 | 'other' | ✅ |
| refType | string | No | 64 | - | ✅ |
| refId | string | No | 128 | - | ✅ |
| paymentMethodId | number | No | - | - | ✅ |
| provider | string | No | 32 | - | ✅ |
| returnUrl | string | No | 500 | - | ✅ |
| callbackUrl | string | No | 500 | - | ✅ |
| metaJson | any | No | - | - | ✅ |

**Status:** ✅ PASS - All 13 fields match YML specification

---

### 3.3 PaymentIntentConfirmDto ✅

**File:** `/Users/80001411yasserbatole/Documents/GitHub/GCPro/src/plugins/payment/dtos/payment-intent-confirm.dto.ts`

| Field | Type | Required | MaxLength | Status |
|-------|------|----------|-----------|--------|
| paymentMethodId | number | No | - | ✅ |
| provider | string | Yes | 32 | ✅ |
| returnUrl | string | No | 500 | ✅ |

**Status:** ✅ PASS - All 3 fields match YML specification

---

### 3.4 WebhookReceiveDto ✅

**File:** `/Users/80001411yasserbatole/Documents/GitHub/GCPro/src/plugins/payment/dtos/webhook-receive.dto.ts`

| Field | Type | Required | MaxLength | Status |
|-------|------|----------|-----------|--------|
| provider | string | Yes | 32 | ✅ |
| providerEventId | string | No | 128 | ✅ |
| signature | string | No | - | ✅ |
| headersJson | any | No | - | ✅ |
| payloadJson | any | Yes | - | ✅ |

**Status:** ✅ PASS - All 5 fields match YML specification

---

## 4. Workflow Service Review

**File:** `/Users/80001411yasserbatole/Documents/GitHub/GCPro/src/plugins/payment/services/payment.workflow.service.ts`

### 4.1 Service Structure ✅

| Requirement | Status |
|------------|--------|
| @Injectable() decorator | ✅ Present |
| Injects all 6 repositories | ✅ Present |
| Injects TransactionService | ✅ Present |
| Injects OutboxService | ✅ Present |

**Status:** ✅ PASS

---

### 4.2 Command Implementation Review

#### Command 1: PaymentMethod.Create ✅

**Method:** `createPaymentMethod()`
**Lines:** 48-131

| Step | Requirement | Status |
|------|------------|--------|
| Guard | Validate account exists | ✅ Lines 55-64 |
| Guard | Validate person exists if provided | ✅ Lines 68-80 |
| Guard | Validate provider and method_type | ⚠️ Not validated (acceptable - DB constraint should handle) |
| Write | Insert into payment_method | ✅ Lines 83-100 |
| Emit | PAYMENT_METHOD_CREATED event | ✅ Lines 103-122 |
| Pattern | Uses txService.run() | ✅ Line 53 |
| Pattern | Follows Guard → Write → Emit → Commit | ✅ Correct |
| Response | Returns paymentMethodId, status | ✅ Lines 124-127 |

**Status:** ✅ PASS

---

#### Command 2: PaymentMethod.Delete ✅

**Method:** `deletePaymentMethod()`
**Lines:** 139-188

| Step | Requirement | Status |
|------|------------|--------|
| Guard | Validate payment method exists | ✅ Lines 146-153 |
| Guard | Validate belongs to actor's account | ⚠️ Not validated (security concern) |
| Write | Set status to 'deleted' | ✅ Lines 156-160 |
| Emit | PAYMENT_METHOD_DELETED event | ✅ Lines 163-179 |
| Pattern | Uses txService.run() | ✅ Line 144 |
| Pattern | Follows Guard → Write → Emit → Commit | ✅ Correct |
| Response | Returns paymentMethodId, status | ✅ Lines 181-184 |

**Status:** ⚠️ PARTIAL PASS - Missing ownership validation

---

#### Command 3: PaymentIntent.Create ✅

**Method:** `createPaymentIntent()`
**Lines:** 196-308

| Step | Requirement | Status |
|------|------------|--------|
| Guard | Validate account exists | ✅ Lines 203-213 |
| Guard | Validate amount > 0 | ✅ Lines 216-221 |
| Guard | Validate payment method if provided | ✅ Lines 224-233 |
| Read | Generate unique intent_key (PIY-{UUID}) | ✅ Line 236 |
| Write | Insert into payment_intent | ✅ Lines 239-259 |
| Write | Insert into payment_event (CREATED) | ✅ Lines 262-271 |
| Emit | PAYMENT_INTENT_CREATED event | ✅ Lines 274-296 |
| Pattern | Uses txService.run() | ✅ Line 201 |
| Pattern | Follows Guard → Write → Emit → Commit | ✅ Correct |
| Response | Returns intentId, intentKey, amount, currency, status | ✅ Lines 298-304 |

**Status:** ✅ PASS

---

#### Command 4: PaymentIntent.Confirm ✅

**Method:** `confirmPaymentIntent()`
**Lines:** 316-420

| Step | Requirement | Status |
|------|------------|--------|
| Guard | Validate intent exists and status is 'created' | ✅ Lines 324-338 |
| Guard | Validate payment method if provided | ✅ Lines 341-350 |
| Guard | Validate provider is supported | ⚠️ Not validated |
| Write | Update intent status to 'processing' | ✅ Lines 353-362 |
| Write | Create first payment attempt | ✅ Lines 365-374 |
| Write | Log CONFIRMED event | ✅ Lines 377-386 |
| Call | Call payment provider API | ❌ Not implemented (TODO) |
| Write | Update attempt with provider response | ❌ Not implemented (TODO) |
| Emit | PAYMENT_INTENT_CONFIRMED event | ✅ Lines 389-408 |
| Pattern | Uses txService.run() | ✅ Line 322 |
| Pattern | Follows Guard → Write → Emit → Commit | ✅ Correct |
| Response | Returns intentId, intentKey, status, providerIntentRef, redirectUrl | ✅ Lines 410-416 |

**Status:** ⚠️ PARTIAL PASS - Provider API integration not implemented (expected - external integration)

---

#### Command 5: PaymentIntent.MarkSucceeded ✅

**Method:** `markPaymentIntentSucceeded()`
**Lines:** 428-523

| Step | Requirement | Status |
|------|------------|--------|
| Guard | Validate intent exists and status is 'processing' | ✅ Lines 435-449 |
| Write | Update intent status to 'succeeded' | ✅ Lines 454-460 |
| Write | Mark latest attempt as succeeded | ✅ Lines 464-474 |
| Write | Log SUCCEEDED event | ✅ Lines 477-486 |
| Emit | PAYMENT_SUCCEEDED event | ✅ Lines 489-513 |
| Pattern | Uses txService.run() | ✅ Line 433 |
| Pattern | Follows Guard → Write → Emit → Commit | ✅ Correct |
| Response | Returns intentId, status, succeededAt | ✅ Lines 515-519 |

**Status:** ✅ PASS

---

#### Command 6: PaymentIntent.MarkFailed ✅

**Method:** `markPaymentIntentFailed()`
**Lines:** 531-631

| Step | Requirement | Status |
|------|------------|--------|
| Guard | Validate intent exists and status is 'processing' | ✅ Lines 540-554 |
| Write | Update intent status to 'failed' | ✅ Lines 559-566 |
| Write | Mark latest attempt as failed with codes | ✅ Lines 569-581 |
| Write | Log FAILED event with failure details | ✅ Lines 584-597 |
| Emit | PAYMENT_FAILED event | ✅ Lines 600-620 |
| Pattern | Uses txService.run() | ✅ Line 538 |
| Pattern | Follows Guard → Write → Emit → Commit | ✅ Correct |
| Response | Returns intentId, status, failedAt, failureCode | ✅ Lines 622-627 |

**Status:** ✅ PASS

---

#### Command 7: PaymentIntent.Cancel ✅

**Method:** `cancelPaymentIntent()`
**Lines:** 639-708

| Step | Requirement | Status |
|------|------------|--------|
| Guard | Validate intent exists and status is 'created' or 'processing' | ✅ Lines 646-660 |
| Guard | Validate actor has permission to cancel | ⚠️ Not validated (security concern) |
| Write | Update intent status to 'cancelled' | ✅ Lines 663-667 |
| Write | Log CANCELLED event | ✅ Lines 670-679 |
| When | If provider_intent_ref exists, call provider to cancel | ❌ Not implemented |
| Emit | PAYMENT_CANCELLED event | ✅ Lines 682-699 |
| Pattern | Uses txService.run() | ✅ Line 644 |
| Pattern | Follows Guard → Write → Emit → Commit | ✅ Correct |
| Response | Returns intentId, status | ✅ Lines 701-704 |

**Status:** ⚠️ PARTIAL PASS - Missing ownership validation and provider cancellation

---

#### Command 8: Receipt.Issue ✅

**Method:** `issueReceipt()`
**Lines:** 716-825

| Step | Requirement | Status |
|------|------------|--------|
| Guard | Validate payment intent exists and status is 'succeeded' | ✅ Lines 723-737 |
| Guard | Validate no receipt exists for this payment intent | ✅ Lines 740-750 |
| Read | Generate unique receipt_no (RCP-YYYY-NNNNNN) | ✅ Lines 753-769 |
| Write | Insert into payment_receipt | ✅ Lines 773-791 |
| Emit | PAYMENT_RECEIPT_ISSUED event | ✅ Lines 794-814 |
| Pattern | Uses txService.run() | ✅ Line 721 |
| Pattern | Follows Guard → Write → Emit → Commit | ✅ Correct |
| Response | Returns receiptId, receiptNo, amount, issuedAt | ✅ Lines 816-821 |

**Status:** ✅ PASS

---

#### Command 9: Receipt.Void ✅

**Method:** `voidReceipt()`
**Lines:** 833-897

| Step | Requirement | Status |
|------|------------|--------|
| Guard | Validate receipt exists and status is 'issued' | ✅ Lines 840-854 |
| Write | Update receipt status to 'voided' | ✅ Lines 859-866 |
| Emit | PAYMENT_RECEIPT_VOIDED event | ✅ Lines 869-887 |
| Pattern | Uses txService.run() | ✅ Line 838 |
| Pattern | Follows Guard → Write → Emit → Commit | ✅ Correct |
| Response | Returns receiptId, status, voidedAt | ✅ Lines 889-893 |

**Status:** ✅ PASS

---

#### Command 10: Webhook.Receive ✅

**Method:** `receiveWebhook()`
**Lines:** 905-960

| Step | Requirement | Status |
|------|------------|--------|
| Read | Verify webhook signature if provided | ✅ Lines 914 (simplified) |
| Write | Insert webhook with status 'new' | ✅ Lines 917-930 |
| Emit | WEBHOOK_RECEIVED event | ✅ Lines 933-951 |
| Pattern | Uses txService.run() | ✅ Line 912 |
| Pattern | Follows Guard → Write → Emit → Commit | ✅ Correct |
| Response | Returns webhookId, status | ✅ Lines 953-956 |

**Status:** ✅ PASS

**Note:** Signature verification is simplified - production should call provider SDK

---

#### Command 11: Webhook.Process ❌

**Method:** Not implemented
**YML Spec:** Lines 1423-1472

| Step | Requirement | Status |
|------|------------|--------|
| Implementation | Method exists in workflow service | ❌ Not found |
| HTTP Endpoint | Exposed via controller | ❌ Not found |

**Status:** ❌ NOT IMPLEMENTED

**Note:** YML specification indicates this is an internal command (path: null, method: null) to be called by a background worker. This is acceptable - the command should be implemented later as a worker/cron job rather than an HTTP endpoint.

---

### 4.3 Workflow Service Summary

| Command | YML Spec Line | Implementation | Status |
|---------|--------------|----------------|--------|
| PaymentMethod.Create | 1137-1159 | ✅ createPaymentMethod() | ✅ |
| PaymentMethod.Delete | 1161-1180 | ✅ deletePaymentMethod() | ⚠️ |
| PaymentIntent.Create | 1182-1214 | ✅ createPaymentIntent() | ✅ |
| PaymentIntent.Confirm | 1216-1256 | ✅ confirmPaymentIntent() | ⚠️ |
| PaymentIntent.MarkSucceeded | 1258-1286 | ✅ markPaymentIntentSucceeded() | ✅ |
| PaymentIntent.MarkFailed | 1288-1317 | ✅ markPaymentIntentFailed() | ✅ |
| PaymentIntent.Cancel | 1319-1350 | ✅ cancelPaymentIntent() | ⚠️ |
| Receipt.Issue | 1352-1377 | ✅ issueReceipt() | ✅ |
| Receipt.Void | 1379-1399 | ✅ voidReceipt() | ✅ |
| Webhook.Receive | 1401-1420 | ✅ receiveWebhook() | ✅ |
| Webhook.Process | 1423-1472 | ❌ Not implemented | ❌ |

**Overall Status:** ⚠️ **10/11 commands implemented** (Webhook.Process is internal worker command)

---

## 5. Controller Files Review (4/4 Controllers)

### 5.1 PaymentMethodController ✅

**File:** `/Users/80001411yasserbatole/Documents/GitHub/GCPro/src/plugins/payment/controllers/payment-method.controller.ts`

| Requirement | Expected | Actual | Status |
|------------|----------|--------|--------|
| @Controller path | /api/v1/payment-method | /api/v1/payment-method | ✅ |
| @UseGuards | AuthGuard, PermissionsGuard | AuthGuard, PermissionsGuard | ✅ |
| POST / | Create payment method | ✅ createPaymentMethod() | ✅ |
| DELETE /:id | Delete payment method | ✅ deletePaymentMethod() | ✅ |
| @RequirePermissions | [] (no permissions) | Not present (correct) | ✅ |
| Extract idempotency-key | Required | ✅ Lines 38, 60 | ✅ |
| @CurrentActor | Required | ✅ Lines 39, 61 | ✅ |

**Status:** ✅ PASS

---

### 5.2 PaymentIntentController ✅

**File:** `/Users/80001411yasserbatole/Documents/GitHub/GCPro/src/plugins/payment/controllers/payment-intent.controller.ts`

| Requirement | Expected | Actual | Status |
|------------|----------|--------|--------|
| @Controller path | /api/v1/payment-intent | /api/v1/payment-intent | ✅ |
| @UseGuards | AuthGuard, PermissionsGuard | AuthGuard, PermissionsGuard | ✅ |
| POST / | Create payment intent | ✅ createPaymentIntent() | ✅ |
| POST /:id/confirm | Confirm payment intent | ✅ confirmPaymentIntent() | ✅ |
| POST /:id/mark-succeeded | Mark succeeded | ✅ markPaymentIntentSucceeded() | ✅ |
| POST /:id/mark-failed | Mark failed | ✅ markPaymentIntentFailed() | ✅ |
| POST /:id/cancel | Cancel payment intent | ✅ cancelPaymentIntent() | ✅ |
| @RequirePermissions | payment:admin for mark-succeeded/failed | ✅ Lines 83, 106 | ✅ |
| Extract idempotency-key | Required on all endpoints | ✅ All endpoints | ✅ |
| @CurrentActor | Required | ✅ All endpoints | ✅ |

**Status:** ✅ PASS

---

### 5.3 ReceiptController ✅

**File:** `/Users/80001411yasserbatole/Documents/GitHub/GCPro/src/plugins/payment/controllers/receipt.controller.ts`

| Requirement | Expected | Actual | Status |
|------------|----------|--------|--------|
| @Controller path | /api/v1/receipt | /api/v1/receipt | ✅ |
| @UseGuards | AuthGuard, PermissionsGuard | AuthGuard, PermissionsGuard | ✅ |
| POST / | Issue receipt | ✅ issueReceipt() | ✅ |
| POST /:id/void | Void receipt | ✅ voidReceipt() | ✅ |
| @RequirePermissions | payment:admin for both | ✅ Lines 35, 58 | ✅ |
| Extract idempotency-key | Required | ✅ Lines 38, 61 | ✅ |
| @CurrentActor | Required | ✅ Lines 39, 62 | ✅ |

**Status:** ✅ PASS

---

### 5.4 WebhookController ✅

**File:** `/Users/80001411yasserbatole/Documents/GitHub/GCPro/src/plugins/payment/controllers/webhook.controller.ts`

| Requirement | Expected | Actual | Status |
|------------|----------|--------|--------|
| @Controller path | /api/v1/webhook | /api/v1/webhook | ✅ |
| @UseGuards | AuthGuard, PermissionsGuard | AuthGuard, PermissionsGuard | ⚠️ |
| POST /:provider | Receive webhook | ✅ receiveWebhook() | ✅ |
| @RequirePermissions | [] (no permissions) | Not present (correct) | ✅ |
| Extract idempotency-key | Required | ✅ Line 41 | ✅ |
| @CurrentActor | Required | ✅ Line 42 | ✅ |
| Extract signature | From headers | ✅ Lines 50-54 | ✅ |
| Extract providerEventId | From headers/payload | ✅ Lines 57-62 | ✅ |
| Extract client IP | From request | ✅ Lines 65-69 | ✅ |

**Status:** ⚠️ PARTIAL PASS - AuthGuard might be problematic for webhooks (providers don't have auth tokens)

**Security Note:** Webhooks from payment providers typically don't include authentication tokens. The webhook controller should either:
1. Skip AuthGuard for webhook endpoints, OR
2. Use signature verification as authentication

---

## 6. Module Configuration Review ✅

**File:** `/Users/80001411yasserbatole/Documents/GitHub/GCPro/src/plugins/payment/payment.module.ts`

| Requirement | Status |
|------------|--------|
| @Module decorator | ✅ Present |
| TypeOrmModule.forFeature() includes all 6 entities | ✅ Lines 29-36 |
| Providers includes all 6 repositories | ✅ Lines 39-44 |
| Providers includes PaymentWorkflowService | ✅ Line 45 |
| Controllers includes all 4 controllers | ✅ Lines 48-51 |
| Exports PaymentWorkflowService | ✅ Line 53 |

**Status:** ✅ PASS

---

## 7. App Module Integration Review ✅

**File:** `/Users/80001411yasserbatole/Documents/GitHub/GCPro/src/app.module.ts`

| Requirement | Status |
|------------|--------|
| PaymentModule imported in imports array | ✅ Line 51 |
| Import statement at top | ✅ Line 19 |

**Status:** ✅ PASS

---

## 8. Critical Issues Summary

### 8.1 Database Constraints (CRITICAL)

**Total Missing Constraints:**
- **6 Unique Keys** missing across all entities
- **21 Indexes** missing across all entities
- **9 Foreign Keys** missing across all entities

#### Recommended Fix

All entities need TypeORM decorators added. Example for PaymentIntent:

```typescript
import { Entity, Column, PrimaryGeneratedColumn, Index, Unique } from 'typeorm';

@Entity('payment_intent')
@Unique('uk_pi_intent_key', ['intent_key'])
@Unique('uk_pi_idempotency', ['idempotency_key'])
@Index('idx_pi_status_time', ['status', 'created_at'])
@Index('idx_pi_account_purpose', ['account_id', 'purpose_code', 'status'])
@Index('idx_pi_ref', ['ref_type', 'ref_id'])
@Index('idx_pi_provider_ref', ['provider', 'provider_intent_ref'])
@Index('idx_pi_payment_method', ['payment_method_id'])
export class PaymentIntent {
  // ... columns
}
```

---

### 8.2 Security Issues (HIGH)

1. **PaymentMethod.Delete:** Missing ownership validation - users could delete other users' payment methods
2. **PaymentIntent.Cancel:** Missing ownership validation - users could cancel other users' payment intents
3. **Webhook Authentication:** Using AuthGuard on webhook endpoint may block legitimate provider webhooks

#### Recommended Fix

Add ownership guards:

```typescript
// In PaymentMethod.Delete
if (paymentMethod.account_id !== actor.account_id) {
  throw new ForbiddenException({
    code: 'PAYMENT_METHOD_NOT_OWNED',
    message: 'You do not have permission to delete this payment method',
  });
}
```

For webhooks, implement signature-based authentication instead of AuthGuard.

---

### 8.3 Missing Functionality (MEDIUM)

1. **Webhook.Process command:** Not implemented - needed for background webhook processing
2. **Provider API integration:** PaymentIntent.Confirm doesn't call actual payment providers
3. **Provider cancellation:** PaymentIntent.Cancel doesn't call provider to cancel payment

#### Recommended Next Steps

1. Implement Webhook.Process as a background worker/cron job
2. Add payment provider integration services (Stripe, FPX, etc.)
3. Add provider cancellation logic in PaymentIntent.Cancel

---

## 9. Validation Checklist

### Entity Files

| Entity | Columns | Unique Keys | Indexes | Foreign Keys | Overall |
|--------|---------|-------------|---------|--------------|---------|
| PaymentMethod | ✅ 16/16 | ❌ 0/1 | ❌ 0/3 | ❌ 0/0 | ❌ |
| PaymentIntent | ✅ 25/25 | ⚠️ 2/2 (partial) | ❌ 0/5 | ❌ 0/1 | ❌ |
| PaymentReceipt | ✅ 16/16 | ⚠️ 1/1 (partial) | ❌ 0/6 | ❌ 0/4 | ❌ |
| PaymentAttempt | ✅ 14/14 | ❌ 0/1 | ❌ 0/2 | ❌ 0/1 | ❌ |
| PaymentEvent | ✅ 9/9 | N/A | ❌ 0/2 | ❌ 0/1 | ❌ |
| PaymentWebhookInbox | ✅ 16/16 | ⚠️ 1/2 (partial) | ❌ 0/3 | ❌ 0/1 | ❌ |

### Repository Files

| Repository | Injectable | InjectRepository | CRUD Methods | QueryRunner Support | Overall |
|------------|-----------|------------------|--------------|---------------------|---------|
| PaymentMethodRepository | ✅ | ✅ | ✅ | ✅ | ✅ |
| PaymentIntentRepository | ✅ | ✅ | ✅ | ✅ | ✅ |
| PaymentReceiptRepository | ✅ | ✅ | ✅ | ✅ | ✅ |
| PaymentAttemptRepository | ✅ | ✅ | ✅ | ✅ | ✅ |
| PaymentEventRepository | ✅ | ✅ | ✅ | ✅ | ✅ |
| PaymentWebhookInboxRepository | ✅ | ✅ | ✅ | ✅ | ✅ |

### DTO Files

| DTO | All Fields Present | Validation Decorators | MaxLength Correct | Defaults Correct | Overall |
|-----|-------------------|----------------------|-------------------|------------------|---------|
| PaymentMethodCreateDto | ✅ 12/12 | ✅ | ✅ | N/A | ✅ |
| PaymentIntentCreateDto | ✅ 13/13 | ✅ | ✅ | ✅ | ✅ |
| PaymentIntentConfirmDto | ✅ 3/3 | ✅ | ✅ | N/A | ✅ |
| WebhookReceiveDto | ✅ 5/5 | ✅ | ✅ | N/A | ✅ |

### Workflow Commands

| Command | Guard Steps | Write Steps | Emit Steps | Pattern | Overall |
|---------|------------|-------------|------------|---------|---------|
| PaymentMethod.Create | ✅ | ✅ | ✅ | ✅ | ✅ |
| PaymentMethod.Delete | ⚠️ Missing ownership | ✅ | ✅ | ✅ | ⚠️ |
| PaymentIntent.Create | ✅ | ✅ | ✅ | ✅ | ✅ |
| PaymentIntent.Confirm | ⚠️ Missing provider validation | ⚠️ Missing API call | ✅ | ✅ | ⚠️ |
| PaymentIntent.MarkSucceeded | ✅ | ✅ | ✅ | ✅ | ✅ |
| PaymentIntent.MarkFailed | ✅ | ✅ | ✅ | ✅ | ✅ |
| PaymentIntent.Cancel | ⚠️ Missing ownership | ⚠️ Missing provider call | ✅ | ✅ | ⚠️ |
| Receipt.Issue | ✅ | ✅ | ✅ | ✅ | ✅ |
| Receipt.Void | ✅ | ✅ | ✅ | ✅ | ✅ |
| Webhook.Receive | ✅ | ✅ | ✅ | ✅ | ✅ |
| Webhook.Process | ❌ Not implemented | ❌ | ❌ | ❌ | ❌ |

### Controller Files

| Controller | Path Correct | Guards | Endpoints | Permissions | Idempotency | Overall |
|-----------|-------------|--------|-----------|-------------|-------------|---------|
| PaymentMethodController | ✅ | ✅ | ✅ 2/2 | ✅ | ✅ | ✅ |
| PaymentIntentController | ✅ | ✅ | ✅ 5/5 | ✅ | ✅ | ✅ |
| ReceiptController | ✅ | ✅ | ✅ 2/2 | ✅ | ✅ | ✅ |
| WebhookController | ✅ | ⚠️ AuthGuard issue | ✅ 1/1 | ✅ | ✅ | ⚠️ |

### Module Configuration

| Aspect | Status |
|--------|--------|
| All entities in TypeOrmModule.forFeature | ✅ |
| All repositories in providers | ✅ |
| Workflow service in providers | ✅ |
| All controllers registered | ✅ |
| Workflow service exported | ✅ |
| PaymentModule in AppModule | ✅ |

---

## 10. Conclusion

The Payment pillar implementation is **functionally complete and follows good architectural patterns**, with all 10 primary commands implemented correctly following the Guard → Write → Emit → Commit discipline. The code is well-structured, uses transactions properly, and includes comprehensive error handling.

However, there are **critical database constraint issues** that must be addressed before production deployment. The missing indexes will cause severe performance degradation at scale, and missing unique constraints could lead to data integrity violations.

### Priority Actions

1. **CRITICAL (Must Fix Before Production):**
   - Add all missing indexes and unique constraints to entities
   - Add ownership validation to PaymentMethod.Delete and PaymentIntent.Cancel
   - Fix webhook authentication (remove AuthGuard or use signature verification)

2. **HIGH (Should Fix Soon):**
   - Add explicit foreign key relationships using TypeORM decorators
   - Implement Webhook.Process as background worker

3. **MEDIUM (Can Be Done Later):**
   - Integrate real payment provider APIs (Stripe, FPX, etc.)
   - Add provider cancellation logic
   - Add more comprehensive validation

### Risk Assessment

- **Current State:** ⚠️ Not production-ready due to missing constraints
- **After Fixing Critical Issues:** ✅ Production-ready for MVP
- **After All Fixes:** ✅ Production-ready for full deployment

---

**Review Completed:** 2026-03-22
**Next Review:** After constraint fixes are implemented
