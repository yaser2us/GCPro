# GCPro Pillar Implementation Status

**Last Updated:** 2026-03-17
**Database Schema:** FULL-DDL.md
**Total Tables:** 149

---

## Summary

| Status | Pillars | Tables | Percentage |
|--------|---------|--------|------------|
| ✅ **Implemented** | 8 pillars | 42 tables | 28% |
| 🚧 **Partial** | 3 pillars | 15 tables | 10% |
| ⏳ **Pending** | 10 pillars | 92 tables | 62% |
| **TOTAL** | **21 pillars** | **149 tables** | **100%** |

---

## Implementation Status by Pillar

### ✅ IMPLEMENTED (8 Pillars - 42 Tables)

#### 1. User Pillar ✅
**Status:** Fully Implemented
**Location:** `src/plugins/user/`
**Tables (5):**
- ✅ `user` - User accounts
- ✅ `user_credential` - Passwords, tokens
- ✅ `user_permission` - User-permission links
- ✅ `user_role` - User-role links
- ✅ `device_token` - Push notification tokens

**Features:**
- User registration
- Authentication
- Role-based access control
- Device token management

---

#### 2. Person Pillar ✅
**Status:** Fully Implemented
**Location:** `src/plugins/person/`
**Tables (3):**
- ✅ `person` - Individual persons
- ✅ `person_identity` - ID documents
- ✅ `person_relationship` - Family relationships

**Features:**
- Person profile management
- Identity verification
- Relationship tracking

---

#### 3. Permission Pillar ✅
**Status:** Fully Implemented
**Location:** `src/plugins/permission/`
**Tables (2):**
- ✅ `permission` - Permission definitions
- ✅ `role` - Role definitions
- ✅ `role_permission` - Role-permission links

**Features:**
- Permission management
- Role management
- RBAC system

---

#### 4. Wallet Pillar ✅ (Just Refactored!)
**Status:** Fully Implemented + Refactored
**Location:** `src/plugins/wallet/`
**Tables (6):**
- ✅ `wallet` - Wallet accounts
- ✅ `wallet_balance_snapshot` - Current balances
- ✅ `ledger_txn` - Transactions
- ✅ `ledger_entry` - Double-entry records
- ✅ `account` - Accounting accounts
- ✅ `account_person` - Account-person links

**Features:**
- Wallet creation and management
- Deposit and withdrawal
- Double-entry ledger
- Mission reward processing (event-driven)
- **NEW:** Handler Services pattern

**Event Consumers:**
- ✅ `MISSION_REWARD_REQUESTED` → Credits wallet

**Event Producers:**
- ✅ `WALLET_CREDITED`
- ✅ `WALLET_DEBITED`

---

#### 5. Missions Pillar ✅
**Status:** Fully Implemented
**Location:** `src/plugins/missions/`
**Tables (6):**
- ✅ `mission_definition` - Mission templates
- ✅ `mission_assignment` - User assignments
- ✅ `mission_submission` - User submissions
- ✅ `mission_submission_file` - Submission attachments
- ✅ `mission_reward_grant` - Reward grants
- ✅ `mission_event` - Mission events
- ✅ `mission_progress` - Progress tracking

**Features:**
- Mission definition creation
- Mission assignment
- Submission upload
- Approval workflow
- Reward distribution

**Event Producers:**
- ✅ `MISSION_DEFINITION_CREATED`
- ✅ `MISSION_ASSIGNED`
- ✅ `MISSION_SUBMISSION_CREATED`
- ✅ `MISSION_REWARD_REQUESTED`

---

#### 6. File Pillar ✅
**Status:** Fully Implemented
**Location:** `src/plugins/file/`
**Tables (8):**
- ✅ `file_upload` - File metadata
- ✅ `file_version` - File versions
- ✅ `file_link` - Entity-file associations
- ✅ `file_access_token` - Access tokens
- ✅ `file_tag` - Tag definitions
- ✅ `file_upload_tag` - File-tag links
- ✅ `file_scan_result` - Virus scan results
- ✅ `file_event` - File events

**Features:**
- File upload and storage
- Version management
- Access control
- Virus scanning
- Tag management

---

#### 7. Notification Pillar ✅
**Status:** Fully Implemented
**Location:** `src/plugins/notification/`
**Tables (6):**
- ✅ `notification_message` - Messages
- ✅ `notification_template` - Templates
- ✅ `notification_delivery_attempt` - Delivery tracking
- ✅ `notification_schedule` - Scheduled messages
- ✅ `notification_preference` - User preferences
- ✅ `notification_channel_preference` - Channel settings

**Features:**
- Template management
- Message sending
- Delivery tracking
- Scheduling
- User preferences

---

#### 8. Survey Pillar ✅
**Status:** Fully Implemented
**Location:** `src/plugins/survey/`
**Tables (6):**
- ✅ `survey` - Survey definitions
- ✅ `survey_version` - Survey versions
- ✅ `survey_question` - Questions
- ✅ `survey_question_option` - Answer options
- ✅ `survey_response` - User responses
- ✅ `survey_response_file` - Response attachments
- ✅ `survey_answer` - Individual answers

**Features:**
- Survey creation
- Question management
- Response collection
- File attachments

---

### 🚧 PARTIAL IMPLEMENTATION (3 Pillars - 15 Tables)

#### 9. CoreKit (Foundation) 🚧
**Status:** Partially Implemented
**Location:** `src/corekit/`
**Tables (2 of 3):**
- ✅ `outbox_event` - Event outbox
- 🚧 `outbox_event_consumer` - Consumer tracking (not used yet)
- ✅ `audit_log` - Audit trail (schema exists, service TBD)

**Implemented:**
- TransactionService
- OutboxService
- OutboxProcessorService
- EventBusService
- StepRunner
- AuthGuard, PermissionsGuard

**Pending:**
- Consumer tracking
- Audit logging service

---

#### 10. Address 🚧
**Status:** Schema Only
**Tables (1):**
- 🚧 `address` - Addresses (schema exists)

**Needed For:**
- Person addresses
- Medical provider addresses
- Policy billing addresses

**Priority:** Medium

---

#### 11. KYC 🚧
**Status:** Schema Only
**Tables (2):**
- 🚧 `kyc` - KYC records
- 🚧 `verification_status` - Verification tracking

**Needed For:**
- Person verification
- Compliance requirements

**Priority:** High (for insurance products)

---

### ⏳ PENDING IMPLEMENTATION (10 Pillars - 92 Tables)

#### 12. Commission Pillar ⏳
**Priority:** HIGH (Next after this discussion)
**Tables (7):**
- ⏳ `commission_program` - Commission programs
- ⏳ `commission_rule` - Commission calculation rules
- ⏳ `commission_accrual` - Earned commissions
- ⏳ `commission_participant` - Agents/partners
- ⏳ `commission_payout_batch` - Payout batches
- ⏳ `commission_payout_item` - Individual payouts
- ⏳ `commission_payout_item_accrual` - Payout-accrual links

**Features Needed:**
- Commission program management
- Rule-based calculation
- Accrual tracking
- Batch payouts
- Event-driven processing

**Event Consumers Needed:**
- `POLICY_CREATED` → Calculate commission
- `POLICY_RENEWED` → Calculate renewal commission
- `WALLET_CREDITED` → Track eligible transactions?

**Event Producers:**
- `COMMISSION_CALCULATED`
- `COMMISSION_ACCRUED`
- `COMMISSION_PAID`

**Dependencies:**
- ✅ Wallet (for payouts)
- ⏳ Policy (not implemented yet)

---

#### 13. Referral Pillar ⏳
**Priority:** HIGH
**Tables (7):**
- ⏳ `referral_program` - Referral programs
- ⏳ `referral_rule` - Referral rules
- ⏳ `referral_code` - Referral codes
- ⏳ `referral_invite` - Invitations
- ⏳ `referral_chain` - Referral trees
- ⏳ `referral_conversion` - Successful referrals
- ⏳ `referral_reward_grant` - Reward grants
- ⏳ `referral_event` - Referral events

**Features Needed:**
- Referral code generation
- Invite tracking
- Conversion tracking
- Reward distribution
- Multi-level referral chains

**Event Consumers Needed:**
- `USER_REGISTERED` → Check referral code
- `POLICY_CREATED` → Grant referral reward

**Event Producers:**
- `REFERRAL_CONVERSION`
- `REFERRAL_REWARD_GRANTED`

**Dependencies:**
- ✅ User
- ✅ Wallet (for rewards)

---

#### 14. Policy Pillar ⏳
**Priority:** CRITICAL (Core Business)
**Tables (18):**
- ⏳ `policy` - Insurance policies
- ⏳ `policy_member` - Covered members
- ⏳ `policy_package` - Coverage packages
- ⏳ `policy_package_rate` - Premium rates
- ⏳ `policy_benefit_entitlement` - Benefit limits
- ⏳ `policy_benefit_usage` - Benefit usage tracking
- ⏳ `policy_benefit_usage_event` - Usage events
- ⏳ `policy_billing_plan` - Billing schedules
- ⏳ `policy_installment` - Payment installments
- ⏳ `policy_deposit_requirement` - Deposit tracking
- ⏳ `policy_discount_applied` - Applied discounts
- ⏳ `policy_status_event` - Status changes
- ⏳ `policy_remediation_case` - Policy issues
- ⏳ `benefit_catalog` - Available benefits
- ⏳ `benefit_catalog_item` - Catalog items
- ⏳ `benefit_level` - Benefit tiers
- ⏳ `age_band` - Age-based pricing
- ⏳ `smoker_profile` - Smoking status

**Features Needed:**
- Policy creation and management
- Premium calculation
- Benefit tracking
- Billing and installments
- Status management

**Event Consumers Needed:**
- `PAYMENT_COMPLETED` → Activate policy
- `CLAIM_APPROVED` → Update benefit usage

**Event Producers:**
- `POLICY_CREATED`
- `POLICY_ACTIVATED`
- `POLICY_RENEWED`
- `POLICY_CANCELLED`

**Dependencies:**
- ✅ Person
- ⏳ Payment
- ⏳ Claim
- ⏳ Medical Underwriting

---

#### 15. Claim Pillar ⏳
**Priority:** CRITICAL (Core Business)
**Tables (9):**
- ⏳ `claim_case` - Claim cases
- ⏳ `claim_case_number_sequence` - Case numbering
- ⏳ `claim_document` - Supporting documents
- ⏳ `claim_review` - Review workflow
- ⏳ `claim_settlement_flag` - Settlement tracking
- ⏳ `claim_link` - Related claims
- ⏳ `claim_fraud_signal` - Fraud detection
- ⏳ `claim_event` - Claim events
- ⏳ `guarantee_letter` - GL documents

**Features Needed:**
- Claim submission
- Document management
- Review workflow
- Fraud detection
- Settlement processing

**Event Consumers Needed:**
- `POLICY_CREATED` → Set up benefit entitlements

**Event Producers:**
- `CLAIM_SUBMITTED`
- `CLAIM_APPROVED`
- `CLAIM_REJECTED`
- `CLAIM_SETTLED`

**Dependencies:**
- ✅ Policy
- ✅ File
- ⏳ Medical Case
- ✅ Wallet (for payouts)

---

#### 16. Payment Pillar ⏳
**Priority:** CRITICAL (Revenue)
**Tables (7):**
- ⏳ `payment_intent` - Payment intents
- ⏳ `payment_method` - Payment methods
- ⏳ `payment_attempt` - Payment attempts
- ⏳ `payment_receipt` - Payment receipts
- ⏳ `payment_event` - Payment events
- ⏳ `payment_webhook_inbox` - Webhook processing
- ⏳ `bank_profile` - Bank account info

**Features Needed:**
- Payment intent creation
- Payment method management
- Payment processing
- Receipt generation
- Webhook handling
- Integration with payment gateways

**Event Consumers Needed:**
- `POLICY_CREATED` → Create payment intent

**Event Producers:**
- `PAYMENT_INITIATED`
- `PAYMENT_COMPLETED`
- `PAYMENT_FAILED`

**Dependencies:**
- ⏳ Policy

---

#### 17. Medical Case Pillar ⏳
**Priority:** HIGH (For Claims)
**Tables (7):**
- ⏳ `medical_case` - Medical cases
- ⏳ `medical_case_event` - Case events
- ⏳ `medical_provider` - Healthcare providers
- ⏳ `medical_underwriting_case` - Underwriting cases
- ⏳ `medical_underwriting_evidence` - Medical evidence
- ⏳ `medical_underwriting_outcome` - Underwriting decisions
- ⏳ `medical_underwriting_current_outcome` - Current status
- ⏳ `medical_underwriting_term` - Special terms

**Features Needed:**
- Medical case management
- Provider directory
- Underwriting workflow
- Evidence collection
- Risk assessment

**Event Consumers Needed:**
- `POLICY_APPLICATION_SUBMITTED` → Create underwriting case
- `CLAIM_SUBMITTED` → Create medical case

**Event Producers:**
- `MEDICAL_CASE_CREATED`
- `UNDERWRITING_COMPLETED`

**Dependencies:**
- ⏳ Policy
- ⏳ Claim
- ✅ File

---

#### 18. Crowd (Takaful) Pillar ⏳
**Priority:** MEDIUM (Product Extension)
**Tables (10):**
- ⏳ `crowd_period` - Takaful periods
- ⏳ `crowd_period_member` - Period members
- ⏳ `crowd_period_event` - Period events
- ⏳ `crowd_period_run` - Calculation runs
- ⏳ `crowd_period_run_lock` - Concurrency control
- ⏳ `crowd_period_claim` - Claims in period
- ⏳ `crowd_contribution` - Member contributions
- ⏳ `crowd_member_charge` - Member charges
- ⏳ `crowd_package_bucket` - Package groupings
- ⏳ `crowd_claim_payout` - Claim distributions

**Features Needed:**
- Period management
- Contribution calculation
- Claim distribution
- Fund management

**Event Consumers Needed:**
- `POLICY_CREATED` → Add to crowd
- `CLAIM_SETTLED` → Distribute from crowd fund

**Dependencies:**
- ⏳ Policy
- ⏳ Claim

---

#### 19. Discount Pillar ⏳
**Priority:** MEDIUM
**Tables (1):**
- ⏳ `discount_program` - Discount programs

**Features Needed:**
- Discount program management
- Discount application
- Eligibility checking

**Dependencies:**
- ⏳ Policy

---

#### 20. Guideline/Compliance Pillar ⏳
**Priority:** MEDIUM
**Tables (3):**
- ⏳ `guideline_document` - Guideline documents
- ⏳ `guideline_version` - Document versions
- ⏳ `guideline_acceptance` - User acceptances

**Features Needed:**
- Guideline management
- Version control
- User acceptance tracking

**Dependencies:**
- ✅ User
- ✅ File

---

#### 21. Onboarding Pillar ⏳
**Priority:** MEDIUM
**Tables (2):**
- ⏳ `onboarding_progress` - User onboarding
- ⏳ `registration_token` - Registration tokens

**Features Needed:**
- Onboarding flow management
- Progress tracking
- Token-based registration

**Dependencies:**
- ✅ User
- ✅ Person

---

### 🛠️ Utility/Shared Tables (3)

- ✅ `outbox_event` - Event outbox (CoreKit)
- 🚧 `audit_log` - Audit trail (CoreKit)
- ⏳ `resource_ref` - Generic references
- ⏳ `geo_state` - Geographic data

---

## Implementation Priority Roadmap

### Phase 1: Foundation Complete ✅
- ✅ User, Person, Permission
- ✅ Wallet (with event-driven architecture)
- ✅ Missions
- ✅ File, Notification, Survey
- ✅ CoreKit (Outbox Pattern)

### Phase 2: Revenue & Engagement (NEXT) 🎯

**Priority 1: Commission Pillar** ⏳
- **Why:** Generate partner revenue, incentivize growth
- **Depends on:** Wallet ✅, Policy ⏳
- **Event-driven:** Yes
- **Estimated:** 2-3 weeks
- **Tables:** 7

**Priority 2: Referral Pillar** ⏳
- **Why:** User acquisition, growth loop
- **Depends on:** User ✅, Wallet ✅
- **Event-driven:** Yes
- **Estimated:** 1-2 weeks
- **Tables:** 7

### Phase 3: Core Business (Insurance) 🏥

**Priority 3: Policy Pillar** ⏳ (CRITICAL)
- **Why:** Core product
- **Depends on:** Person ✅, Payment ⏳
- **Event-driven:** Yes
- **Estimated:** 4-6 weeks
- **Tables:** 18

**Priority 4: Payment Pillar** ⏳ (CRITICAL)
- **Why:** Revenue collection
- **Depends on:** Policy ⏳
- **Event-driven:** Yes
- **Estimated:** 2-3 weeks
- **Tables:** 7

**Priority 5: Claim Pillar** ⏳ (CRITICAL)
- **Why:** Core service delivery
- **Depends on:** Policy ✅, Medical Case ⏳, Wallet ✅
- **Event-driven:** Yes
- **Estimated:** 3-4 weeks
- **Tables:** 9

**Priority 6: Medical Case Pillar** ⏳
- **Why:** Risk assessment, claim processing
- **Depends on:** Policy ✅, Claim ✅
- **Event-driven:** Yes
- **Estimated:** 2-3 weeks
- **Tables:** 7

### Phase 4: Product Extensions 📦

**Priority 7: Crowd (Takaful) Pillar** ⏳
- **Why:** Takaful product variant
- **Depends on:** Policy ✅, Claim ✅
- **Estimated:** 3-4 weeks
- **Tables:** 10

**Priority 8: Discount Pillar** ⏳
- **Why:** Marketing, pricing flexibility
- **Depends on:** Policy ✅
- **Estimated:** 1 week
- **Tables:** 1

### Phase 5: Supporting Features 🛠️

**Priority 9: KYC Pillar** 🚧
- **Why:** Compliance
- **Depends on:** Person ✅, File ✅
- **Estimated:** 1-2 weeks
- **Tables:** 2

**Priority 10: Address Pillar** 🚧
- **Why:** Person/provider addresses
- **Depends on:** Person ✅
- **Estimated:** 1 week
- **Tables:** 1

**Priority 11: Guideline/Compliance Pillar** ⏳
- **Why:** Legal compliance
- **Depends on:** User ✅, File ✅
- **Estimated:** 1 week
- **Tables:** 3

**Priority 12: Onboarding Pillar** ⏳
- **Why:** User experience
- **Depends on:** User ✅, Person ✅
- **Estimated:** 1 week
- **Tables:** 2

---

## Recommended Next Steps

### Option A: Revenue-First Approach (Recommended)

**Week 1-2: Commission Pillar** 🎯
- High business value
- Incentivizes partners
- Event-driven (uses Wallet ✅)
- Can work without Policy initially (commission on missions, referrals)

**Week 3-4: Referral Pillar** 🎯
- User acquisition
- Growth engine
- Relatively simple
- Event-driven (uses Wallet ✅)

**Week 5-8: Payment Pillar** 💰
- Critical for revenue
- Needed before Policy
- Integration with payment gateways

**Week 9-16: Policy Pillar** 🏥
- Core insurance product
- Most complex
- Depends on Payment ✅

### Option B: Insurance-First Approach

**Week 1-4: Payment Pillar**
**Week 5-12: Policy Pillar**
**Week 13-16: Claim Pillar**

### Option C: Hybrid Approach

**Week 1-2: Commission Pillar** (revenue)
**Week 3-6: Payment Pillar** (foundation)
**Week 7-14: Policy Pillar** (core business)

---

## Technical Debt & Improvements

### Items to Address
1. ✅ Refactor Wallet to Handler Pattern (DONE!)
2. ⏳ Add audit logging service to CoreKit
3. ⏳ Implement consumer tracking in outbox pattern
4. ⏳ Add integration tests for event flows
5. ⏳ Document event catalog

### Architecture Standards
- ✅ Handler Services Pattern (established)
- ✅ Outbox Pattern (implemented)
- ✅ Event-Driven Architecture (documented)
- ✅ Pillar Development Guideline (created)

---

## Metrics

### Code Metrics
- **Implemented Pillars:** 8 (38%)
- **Implemented Tables:** 42 (28%)
- **Total Lines of Code:** ~15,000+ (estimated)
- **Test Coverage:** TBD

### Business Metrics
- **Revenue Pillars:** 0 of 3 implemented (Payment, Policy, Claim)
- **Growth Pillars:** 1 of 2 implemented (Missions ✅, Referral ⏳)
- **Support Pillars:** 5 of 8 implemented

---

**Next Action:** Decide on implementation priority and start Commission or Payment pillar

