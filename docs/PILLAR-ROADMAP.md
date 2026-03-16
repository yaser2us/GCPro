# GCPro Business Pillars Roadmap

Analysis of all business domains from `docs/database/FULL-DDL.md`

**Total Tables:** 139
**Date:** 2026-03-13

---

## ✅ COMPLETED PILLARS (2)

### 1. Missions ✓
**Tables:** 7
- mission_definition
- mission_assignment
- mission_event
- mission_progress
- mission_reward_grant
- mission_submission
- mission_submission_file

**Status:** Implementation complete
**Spec:** `specs/mission/missions.pillar.v2.yml`

### 2. Survey ✓
**Tables:** 7
- survey
- survey_version
- survey_question
- survey_question_option
- survey_response
- survey_response_file
- survey_answer

**Status:** Implementation complete
**Spec:** `specs/survey/survey.pillar.v2.yml`

---

## 🔥 CORE FOUNDATION PILLARS (Priority: P0)

These are essential for the platform to function.

### 3. User Management
**Tables:** 4
- user
- user_credential
- user_permission
- user_role

**Description:** User accounts, authentication, and authorization
**Dependencies:** permission, role
**Complexity:** Medium
**Business Impact:** Critical - Required for all user operations

### 4. Permission & Role Management
**Tables:** 3
- permission
- role
- role_permission

**Description:** RBAC (Role-Based Access Control) system
**Dependencies:** None
**Complexity:** Low
**Business Impact:** Critical - Security foundation

### 5. Person Management
**Tables:** 3
- person
- person_identity
- person_relationship

**Description:** Person entities (customers, dependents, beneficiaries)
**Dependencies:** None
**Complexity:** Medium
**Business Impact:** Critical - Core identity management

### 6. File Management
**Tables:** 8
- file_upload
- file_version
- file_access_token
- file_event
- file_link
- file_scan_result
- file_tag
- file_upload_tag

**Description:** Document management, file storage, virus scanning
**Dependencies:** None
**Complexity:** Medium
**Business Impact:** High - Used by claims, underwriting, KYC

### 7. Notification System
**Tables:** 6
- notification_message
- notification_delivery_attempt
- notification_template
- notification_schedule
- notification_preference
- notification_channel_preference

**Description:** Multi-channel notifications (email, SMS, push)
**Dependencies:** user
**Complexity:** Medium
**Business Impact:** High - User communication

---

## 💰 INSURANCE CORE PILLARS (Priority: P1)

Core insurance business logic.

### 8. Policy Management ⭐
**Tables:** 14
- policy
- policy_member
- policy_package
- policy_package_rate
- policy_billing_plan
- policy_installment
- policy_benefit_entitlement
- policy_benefit_usage
- policy_benefit_usage_event
- policy_discount_applied
- policy_deposit_requirement
- policy_status_event
- policy_remediation_case

**Description:** Insurance policy lifecycle management
**Dependencies:** person, benefit_catalog, discount_program
**Complexity:** High
**Business Impact:** Critical - Core product

### 9. Claims Processing ⭐
**Tables:** 8
- claim_case
- claim_case_number_sequence
- claim_document
- claim_event
- claim_fraud_signal
- claim_link
- claim_review
- claim_settlement_flag

**Description:** Insurance claims workflow
**Dependencies:** policy, file_upload, medical_case
**Complexity:** High
**Business Impact:** Critical - Core operations

### 10. Medical Underwriting
**Tables:** 6
- medical_underwriting_case
- medical_underwriting_evidence
- medical_underwriting_outcome
- medical_underwriting_current_outcome
- medical_underwriting_term

**Description:** Medical risk assessment and underwriting
**Dependencies:** person, policy, file_upload
**Complexity:** High
**Business Impact:** Critical - Risk management

### 11. Benefit Catalog
**Tables:** 3
- benefit_catalog
- benefit_catalog_item
- benefit_level

**Description:** Product benefits and coverage definitions
**Dependencies:** None
**Complexity:** Low
**Business Impact:** High - Product configuration

### 12. Medical Services
**Tables:** 3
- medical_case
- medical_case_event
- medical_provider

**Description:** Medical case tracking and provider management
**Dependencies:** person, claim_case
**Complexity:** Medium
**Business Impact:** High - Claims support

---

## 💳 FINANCIAL PILLARS (Priority: P1)

Financial transactions and accounting.

### 13. Wallet System ⭐
**Tables:** 15
- wallet
- wallet_balance_snapshot
- wallet_batch
- wallet_batch_item
- wallet_deposit_intent
- wallet_spend_intent
- wallet_withdrawal_request
- wallet_payout_attempt
- wallet_hold
- wallet_rule
- wallet_rule_set
- wallet_threshold_rule
- wallet_threshold_event
- wallet_policy_gate

**Description:** Digital wallet, credits, payouts, rules
**Dependencies:** user, policy
**Complexity:** High
**Business Impact:** Critical - Financial core

### 14. Payment Processing
**Tables:** 6
- payment_intent
- payment_method
- payment_attempt
- payment_event
- payment_receipt
- payment_webhook_inbox

**Description:** Payment gateway integration, transactions
**Dependencies:** user, policy
**Complexity:** High
**Business Impact:** Critical - Revenue collection

### 15. Ledger & Accounting
**Tables:** 2
- ledger_txn
- ledger_entry

**Description:** Double-entry bookkeeping, financial records
**Dependencies:** wallet, payment
**Complexity:** High
**Business Impact:** Critical - Financial integrity

---

## 💰 INCENTIVE PILLARS (Priority: P2)

Growth and engagement systems.

### 16. Commission System ⭐
**Tables:** 7
- commission_program
- commission_rule
- commission_participant
- commission_accrual
- commission_payout_batch
- commission_payout_item
- commission_payout_item_accrual

**Description:** Agent/broker commission calculation and payouts
**Dependencies:** policy, wallet
**Complexity:** High
**Business Impact:** High - Sales incentives
**Note:** Spec exists at `specs/commission/commission.pillar.v2.yml`

### 17. Referral System
**Tables:** 8
- referral_program
- referral_rule
- referral_code
- referral_invite
- referral_chain
- referral_event
- referral_conversion
- referral_reward_grant

**Description:** Customer referral rewards and tracking
**Dependencies:** user, wallet
**Complexity:** Medium
**Business Impact:** High - Growth engine

### 18. Discount Programs
**Tables:** 1
- discount_program

**Description:** Promotional discounts and pricing rules
**Dependencies:** policy
**Complexity:** Low
**Business Impact:** Medium - Pricing strategy

---

## 🤝 COMMUNITY PILLARS (Priority: P2)

Peer-to-peer and community features.

### 19. Crowd/Community Pooling ⭐
**Tables:** 10
- crowd_period
- crowd_period_run
- crowd_period_run_lock
- crowd_period_member
- crowd_period_claim
- crowd_period_event
- crowd_contribution
- crowd_member_charge
- crowd_claim_payout
- crowd_package_bucket

**Description:** Community-based insurance pooling (peer-to-peer)
**Dependencies:** policy, claim_case, wallet
**Complexity:** Very High
**Business Impact:** High - Unique differentiator

---

## 🔐 COMPLIANCE & VERIFICATION PILLARS (Priority: P1-P2)

Regulatory and onboarding.

### 20. KYC (Know Your Customer)
**Tables:** 1
- kyc

**Description:** Customer identity verification
**Dependencies:** person, file_upload
**Complexity:** Medium
**Business Impact:** Critical - Regulatory compliance

### 21. Guideline & Compliance
**Tables:** 3
- guideline_document
- guideline_version
- guideline_acceptance

**Description:** Terms, policies, regulatory guidelines
**Dependencies:** user
**Complexity:** Low
**Business Impact:** High - Legal compliance

### 22. Verification Status
**Tables:** 1
- verification_status

**Description:** Multi-step verification workflow tracking
**Dependencies:** person, kyc
**Complexity:** Low
**Business Impact:** Medium - Onboarding

### 23. Onboarding
**Tables:** 1
- onboarding_progress

**Description:** User onboarding journey tracking
**Dependencies:** user, person
**Complexity:** Low
**Business Impact:** Medium - User experience

---

## 🛠️ SUPPORTING PILLARS (Priority: P3)

Support and utility systems.

### 24. Account Management
**Tables:** 2
- account
- account_person

**Description:** Organizational accounts (corporate/family)
**Dependencies:** person
**Complexity:** Medium
**Business Impact:** Medium - B2B support

### 25. Guarantee Letter
**Tables:** 1
- guarantee_letter

**Description:** Medical guarantee letters for providers
**Dependencies:** policy, medical_provider
**Complexity:** Low
**Business Impact:** Medium - Provider relations

### 26. Registration Tokens
**Tables:** 1
- registration_token

**Description:** Temporary registration tokens
**Dependencies:** user
**Complexity:** Low
**Business Impact:** Low - Onboarding utility

### 27. Device Management
**Tables:** 1
- device_token

**Description:** Push notification device tokens
**Dependencies:** user
**Complexity:** Low
**Business Impact:** Low - Notification support

---

## 📊 REFERENCE DATA PILLARS (Priority: P3)

Lookup tables and reference data.

### 28. Geographic Data
**Tables:** 2
- geo_state
- address

**Description:** States, regions, and address management
**Dependencies:** None
**Complexity:** Low
**Business Impact:** Medium - Location services

### 29. Profile Data
**Tables:** 2
- age_band
- smoker_profile
- bank_profile

**Description:** Actuarial and profile reference data
**Dependencies:** None
**Complexity:** Low
**Business Impact:** Medium - Risk assessment

---

## 🔧 INFRASTRUCTURE PILLARS (Priority: P0)

Already implemented or core infrastructure.

### 30. Outbox Pattern (CoreKit)
**Tables:** 2
- outbox_event
- outbox_event_consumer

**Description:** Event-driven architecture backbone
**Status:** Part of CoreKit
**Complexity:** Medium
**Business Impact:** Critical - System integration

### 31. Resource Reference (CoreKit)
**Tables:** 1
- resource_ref

**Description:** Polymorphic resource references
**Status:** Part of CoreKit
**Complexity:** Low
**Business Impact:** High - Data relationships

### 32. Audit Logging (CoreKit)
**Tables:** 1
- audit_log

**Description:** Comprehensive audit trail
**Status:** Part of CoreKit
**Complexity:** Low
**Business Impact:** Critical - Compliance

---

## 📋 IMPLEMENTATION PRIORITY SUMMARY

### Phase 1: Foundation (P0) - 6 Pillars
1. ✅ Missions (Complete)
2. ✅ Survey (Complete)
3. 🔨 User Management
4. 🔨 Permission & Role Management
5. 🔨 Person Management
6. 🔨 File Management
7. 🔨 Notification System

### Phase 2: Insurance Core (P1) - 8 Pillars
8. 🔨 Policy Management ⭐
9. 🔨 Claims Processing ⭐
10. 🔨 Medical Underwriting
11. 🔨 Benefit Catalog
12. 🔨 Medical Services
13. 🔨 Wallet System ⭐
14. 🔨 Payment Processing
15. 🔨 Ledger & Accounting

### Phase 3: Growth & Compliance (P1-P2) - 6 Pillars
16. 🔨 Commission System ⭐ (Spec exists)
17. 🔨 Referral System
18. 🔨 KYC
19. 🔨 Guideline & Compliance
20. 🔨 Verification Status
21. 🔨 Onboarding

### Phase 4: Community & Support (P2-P3) - 7 Pillars
22. 🔨 Crowd/Community Pooling ⭐
23. 🔨 Discount Programs
24. 🔨 Account Management
25. 🔨 Guarantee Letter
26. 🔨 Registration Tokens
27. 🔨 Device Management
28. 🔨 Geographic Data
29. 🔨 Profile Data

---

## 🎯 RECOMMENDED BUILD ORDER

Based on dependencies and business value:

1. **User Management** + **Permission/Role** (Foundation)
2. **Person Management** (Identity foundation)
3. **File Management** (Required by many pillars)
4. **Benefit Catalog** (Product configuration)
5. **Policy Management** ⭐ (Core product)
6. **Wallet System** ⭐ (Financial foundation)
7. **Payment Processing** (Revenue)
8. **Claims Processing** ⭐ (Core operations)
9. **KYC** (Compliance)
10. **Medical Underwriting** (Risk management)
11. **Commission System** ⭐ (Sales incentives)
12. **Referral System** (Growth)
13. **Notification System** (Communication)
14. **Crowd/Community Pooling** ⭐ (Differentiator)

---

## 📊 STATISTICS

- **Total Pillars:** 32
- **Completed:** 2 (6%)
- **P0 (Critical):** 7 pillars, 33 tables
- **P1 (High):** 11 pillars, 62 tables
- **P2 (Medium):** 8 pillars, 30 tables
- **P3 (Low):** 6 pillars, 12 tables

**Stars (⭐):** Complex, high-impact pillars requiring careful design

---

## 💡 NOTES

1. **CoreKit Already Has:**
   - Outbox pattern (outbox_event, outbox_event_consumer)
   - Resource references (resource_ref)
   - Audit logging (audit_log)

2. **Commission Pillar:**
   - Spec already exists at `specs/commission/commission.pillar.v2.yml`
   - Ready to implement

3. **Complexity Levels:**
   - **Low:** Simple CRUD, minimal business logic
   - **Medium:** Moderate workflows, some state machines
   - **High:** Complex state machines, financial calculations
   - **Very High:** Multi-entity orchestration, complex algorithms

4. **Table Count Verification:**
   - Listed tables: 139
   - Already in CoreKit: 3 (outbox_event, outbox_event_consumer, audit_log)
   - Distributed across pillars: 136
