# GC_Pro Platform - Business Overview

**Document Version:** 1.0
**Last Updated:** March 10, 2026
**Prepared By:** System Architecture Team

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [What Problem We Solve](#what-problem-we-solve)
3. [Business Model Overview](#business-model-overview)
4. [Core Business Domains](#core-business-domains)
5. [How It Works - User Journey](#how-it-works---user-journey)
6. [Revenue & Financial Model](#revenue--financial-model)
7. [Growth & Engagement Systems](#growth--engagement-systems)
8. [Risk Management & Compliance](#risk-management--compliance)
9. [Technology Architecture](#technology-architecture)
10. [Key Business Metrics](#key-business-metrics)

---

## Executive Summary

**GC_Pro** is a **community-powered health coverage platform** that combines mutual insurance principles with modern crowdfunding technology. Unlike traditional insurance companies that rely on large capital reserves and actuarial pricing, GC_Pro creates communities of members who collectively fund each other's medical expenses through periodic contributions.

### What Makes Us Different

- **Community-First**: Members pool resources to help each other during medical emergencies
- **Transparent Crowdfunding**: Clear, period-based collection cycles where members see exactly what they're paying for
- **Deposit + Contribution Model**: Members maintain deposits (refundable) plus pay monthly contributions
- **Gamified Engagement**: Missions, referrals, and rewards keep members active and growing the community
- **Agent Network**: Commission-based distribution through agents and partners

---

## What Problem We Solve

### The Pain Points

1. **Traditional Insurance Is Expensive**
   - High premiums with unclear pricing
   - Denied claims and complex processes
   - Profit-driven models where insurers win when claims are minimized

2. **Medical Emergencies Are Financially Devastating**
   - Hospital bills can bankrupt families
   - No safety net for those who can't afford insurance
   - Emergency funds are often insufficient

3. **Lack of Community Support**
   - People face medical crises alone
   - No mutual aid systems in modern society
   - Isolation during health challenges

### Our Solution

**GC_Pro creates risk-sharing communities** where:
- Members pay affordable monthly contributions based on actual claims
- Everyone maintains a refundable deposit as a buffer
- Claims are funded from the collective pool
- Surpluses are redistributed or credited back
- The community supports each other transparently

---

## Business Model Overview

### Core Concept: Crowdfunding Periods

The platform operates on **monthly crowdfunding cycles** called **Crowd Periods**:

```
┌─────────────────────────────────────────────────────┐
│              CROWD PERIOD (Monthly)                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│  1. Period Starts (e.g., March 2026)              │
│  2. Claims Submitted Throughout Month              │
│  3. Period Closes → Calculate Total Claims         │
│  4. Distribute Cost Among Active Members           │
│  5. Collect Contributions from Members             │
│  6. Pay Approved Claims                            │
│  7. Handle Surplus/Deficit                         │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### The Three-Layer Financial Model

#### Layer 1: Policy Deposit (Refundable Buffer)
- Each member maintains a **deposit** in their policy wallet
- Acts as a buffer for urgent claims
- Calculated as: `deposit_capacity = monthly_max_cap × deposit_multiplier × member_count`
- **Refunded** when policy ends or member leaves (minus any debts)

#### Layer 2: Monthly Contributions (Actual Cost)
- Members pay **only for actual claims** from that month
- Formula: `member_contribution = total_approved_claims ÷ active_members`
- If surplus exists, members pay less
- If deficit exists, members pay more (with caps)

#### Layer 3: Deficit/Surplus Management
- **Surplus**: Excess funds → credited to member deposits or future discounts
- **Deficit**: Shortfall → carried forward to next period or deducted from deposits
- Ensures long-term sustainability

---

## Core Business Domains

### 1. **Policy & Membership Management**

#### Policy Lifecycle
```
[Pending] → [Active] → [Grace Period] → [Suspended] → [Expired/Cancelled]
```

**Key Components:**
- **Policy**: The contract between member and platform
- **Policy Package**: Defines coverage levels (e.g., Bronze, Silver, Gold)
- **Policy Member**: Individual covered persons (policyholder + dependents)
- **Policy Benefit Entitlement**: What benefits each member can use
- **Policy Billing Plan**: Payment schedule and installments

#### How Members Join

1. **User Registration**
   - Creates `user` account with credentials
   - Links to `person` record (demographics)
   - Completes `kyc` verification
   - Accepts terms via `guideline_acceptance`

2. **Policy Application**
   - Selects `policy_package` (coverage level)
   - May undergo `medical_underwriting` (risk assessment)
   - Submits required documents via `file_upload`
   - System creates `policy` record

3. **Deposit Payment**
   - System calculates required deposit
   - Member pays via `payment_intent`
   - Funds deposited to `wallet`
   - Policy status → `active`

4. **Ongoing Contributions**
   - Monthly `crowd_period` calculates member's share
   - System creates `crowd_member_charge`
   - Payment collected via `payment_method`
   - Recorded in `ledger_entry`

---

### 2. **Claims Processing**

#### Claim Lifecycle
```
[Draft] → [Submitted] → [Under Review] → [Approved/Rejected] → [Paid]
```

**The Claims Journey:**

1. **Claim Submission** (`claim_case`)
   - Member or dependent gets medical treatment
   - Submits claim with hospital bills
   - Uploads documents (`claim_document`, `file_upload`)
   - System assigns unique `claim_number`

2. **Initial Review** (`claim_review`)
   - Fraud detection checks (`claim_fraud_signal`)
   - Document verification
   - Medical necessity validation
   - Benefit eligibility check

3. **Medical Assessment** (`medical_case`)
   - Medical team reviews diagnosis
   - Validates treatment type
   - Confirms hospital credentials (`medical_provider`)
   - Records assessment in `medical_case_event`

4. **Approval/Rejection**
   - Approver sets `approved_amount`
   - May be less than `requested_amount`
   - Rejection logged with `rejection_reason`
   - Status updated in `claim_event`

5. **Settlement** (`claim_settlement_flag`)
   - Approved claims added to current `crowd_period`
   - Marked for payment in period calculation
   - Paid from collective pool

6. **Payout** (`crowd_claim_payout`)
   - Money transferred to claimant
   - Recorded in `ledger_txn`
   - Receipt generated (`payment_receipt`)

#### Claim Categories

- **Inpatient**: Hospital admissions (highest cost)
- **Outpatient**: Doctor visits, consultations
- **Emergency**: ER treatment
- **Maternity**: Pregnancy and delivery
- **Dental**: Oral health
- **Optical**: Vision care

---

### 3. **Crowdfunding Period Management**

This is the **heart of the platform** - how money flows from members to claimants.

#### Period Calculation Process

**Phase 1: Period Creation** (`crowd_period`)
```sql
period_key: "2026-03"
period_from: 2026-03-01 00:00:00
period_to: 2026-03-31 23:59:59
status: "created"
```

**Phase 2: Collect Claims** (`crowd_period_claim`)
- All approved claims from March link to this period
- System calculates: `case_required_amount = SUM(approved_amounts)`

**Phase 3: Calculate Member Shares** (`crowd_period_member`)
For each active policy member:
```javascript
// Base calculation
base_share = case_required_amount / total_active_members

// Adjust for previous debt/surplus
previous_debt = last_period.debt_amount_per_member
previous_surplus = last_period.extra_amount_per_member

// Final charge
member_charge = base_share + previous_debt - previous_surplus

// Apply caps (max monthly cap)
capped_charge = MIN(member_charge, policy_package.monthly_max_cap)
```

**Phase 4: Execute Collection** (`crowd_member_charge`)
- Create charge records for each member
- Attempt payment via `payment_intent`
- Record success/failure in `payment_attempt`
- Update member status if payment fails

**Phase 5: Pay Claims** (`crowd_claim_payout`)
- Transfer funds to claimants
- Record in `ledger_txn`
- Update claim status to `paid`

**Phase 6: Handle Surplus/Deficit**
```javascript
total_collected = SUM(member_charges_paid)
total_required = case_required_amount

if (total_collected > total_required) {
  // SURPLUS
  extra_amount = total_collected - total_required
  // Options:
  // 1. Credit to member deposits
  // 2. Reduce next period contribution
  // 3. Build reserve fund
}

if (total_collected < total_required) {
  // DEFICIT
  debt_amount = total_required - total_collected
  // Options:
  // 1. Carry forward to next period
  // 2. Deduct from member deposits (if allowed)
  // 3. Increase next period contribution
}
```

**Phase 7: Period Closure**
```sql
UPDATE crowd_period SET
  status = 'completed',
  completed_at = NOW(),
  total_collected_amount = X,
  total_required_amount = Y,
  extra_amount = Z,
  debt_amount = W
```

#### Period States
- `created`: Period initialized
- `calculating`: Computing member shares
- `collecting`: Charging members
- `paying`: Disbursing to claimants
- `completed`: Fully settled
- `failed`: Critical error (rare)

---

### 4. **Wallet & Financial Management**

Every entity that handles money has a **wallet** (`wallet` table).

#### Wallet Types

1. **Policy Wallet** (`owner_type: 'policy'`)
   - Holds member deposit
   - Receives refunds/surpluses
   - Debited for deficits if allowed
   - Refunded when policy ends

2. **User Wallet** (`owner_type: 'user'`)
   - For referral bonuses
   - Mission rewards
   - Promotional credits
   - Can be withdrawn or used for payments

3. **System Wallets**
   - Claims pool wallet
   - Commission pool wallet
   - Reserve fund wallet

#### Wallet Operations

**Deposit/Credit:**
```
payment_intent → wallet_deposit_intent → ledger_txn (CREDIT) → wallet.balance ↑
```

**Spend/Debit:**
```
charge → wallet_spend_intent → ledger_txn (DEBIT) → wallet.balance ↓
```

**Holds (Escrow):**
```sql
-- When processing large transaction
INSERT INTO wallet_hold (wallet_id, amount, reason, status)
-- Temporarily reduces available_balance
-- Released when transaction completes
```

**Balance Tracking:**
```javascript
wallet.balance = total_credits - total_debits - total_holds
wallet.available_balance = balance - SUM(active_holds)
```

**Ledger Integrity:**
- Every transaction requires `ledger_txn` (transaction)
- Double-entry: `ledger_entry` records debit & credit sides
- Immutable audit trail
- Reconcilable with wallets

---

### 5. **Commission & Distribution Network**

GC_Pro grows through **agents** who earn commissions.

#### Commission Programs (`commission_program`)

Types:
- **Acquisition**: Earn when signing new policies
- **Renewal**: Earn when policies renew
- **Residual**: Ongoing % of member contributions
- **Team Override**: Earn from downline agents

#### Commission Workflow

1. **Agent Enrollment**
   - Agent becomes `commission_participant`
   - Assigned to `commission_program`
   - Linked via `commission_rule` (defines rates)

2. **Policy Sale**
   - Member signs policy
   - System logs agent in `policy.meta.agent_id`
   - Creates `commission_accrual` (pending commission)

3. **Accrual Calculation**
```javascript
commission_accrual.amount = policy_premium × commission_rule.rate
commission_accrual.status = 'pending'
```

4. **Batch Processing** (`commission_payout_batch`)
   - Monthly or weekly batches
   - Collect all pending accruals
   - Create `commission_payout_item` for each agent

5. **Payout** (`commission_payout_item`)
   - Transfer to agent wallet
   - Record in ledger
   - Update accrual status → `paid`

**Example:**
```
Agent sells policy with annual fee: 1,200 MYR
Commission rate: 10%
Commission earned: 120 MYR
Payout schedule: Monthly over 12 months = 10 MYR/month
```

---

### 6. **Medical Underwriting (Risk Assessment)**

For high-risk applicants, the system performs underwriting.

#### Underwriting Workflow

1. **Trigger Conditions**
   - Age > 55
   - Pre-existing conditions declared
   - High coverage amounts
   - Previous claim history

2. **Case Creation** (`medical_underwriting_case`)
```sql
INSERT INTO medical_underwriting_case (
  application_id,
  applicant_person_id,
  status: 'pending'
)
```

3. **Evidence Collection** (`medical_underwriting_evidence`)
   - Medical reports
   - Lab results
   - Doctor letters
   - Linked via `file_upload`

4. **Medical Review**
   - Underwriter reviews evidence
   - Assesses risk level
   - Decides outcome

5. **Decision** (`medical_underwriting_outcome`)
   - **Accept**: Normal pricing
   - **Accept with Exclusions**: Specific conditions not covered
   - **Accept with Loading**: Higher premium (e.g., +20%)
   - **Decline**: Too risky

6. **Apply Terms** (`medical_underwriting_term`)
```javascript
// If accepted with exclusions
{
  term_type: "exclusion",
  description: "Pre-existing diabetes excluded for 2 years",
  effective_from: "2026-03-10",
  effective_to: "2028-03-10"
}

// If accepted with loading
{
  term_type: "loading",
  description: "+25% premium loading for hypertension",
  value: 1.25 // multiplier
}
```

7. **Policy Creation**
   - Terms applied to policy
   - Reflected in pricing and benefits

---

### 7. **Payment Processing**

The platform handles complex payment flows.

#### Payment Flow

1. **Intent Creation** (`payment_intent`)
```javascript
payment_intent: {
  type: "deposit" | "contribution" | "premium",
  amount: 500.00,
  currency: "MYR",
  status: "pending",
  payment_method_id: 123,
  related_to: "policy_id:456"
}
```

2. **Payment Method** (`payment_method`)
   - Credit/Debit Card
   - Bank Transfer (FPX)
   - E-Wallet (Touch n Go, GrabPay)
   - Direct Debit

3. **Payment Attempt** (`payment_attempt`)
   - Execute via payment gateway
   - Handle success/failure
   - Retry logic for failures

4. **Payment Event** (`payment_event`)
   - Record all state changes
   - Audit trail

5. **Webhook Handling** (`payment_webhook_inbox`)
   - Receive async notifications from gateway
   - Process status updates
   - Handle edge cases

6. **Receipt Generation** (`payment_receipt`)
   - Successful payments get receipts
   - Downloadable PDF
   - Email to user

#### Payment States
```
pending → processing → succeeded
                     ↘ failed → retry → succeeded
                                      ↘ failed (final)
```

---

### 8. **Benefit Management**

What medical services are covered?

#### Benefit Structure

**Level 1: Benefit Catalog** (`benefit_catalog`)
- Named collection of benefits
- Versioned for changes over time
- Example: "Standard Hospital Coverage v2.0"

**Level 2: Catalog Items** (`benefit_catalog_item`)
- Individual benefit types
- Examples:
  - Room & Board
  - Surgical Fees
  - ICU Charges
  - Pre/Post Hospitalization
  - Maternity

**Level 3: Benefit Levels** (`benefit_level`)
- Coverage limits per benefit
- Example:
```javascript
{
  benefit_code: "room_board",
  room_type: "standard_ward",
  daily_limit: 200.00,
  annual_limit: 100000.00,
  lifetime_limit: 500000.00,
  co_pay_pct: 0,
  deductible: 0
}
```

#### Policy Benefit Entitlement

When policy is created:
```sql
-- Copy benefit levels to policy
INSERT INTO policy_benefit_entitlement (
  policy_id, benefit_code, daily_limit, annual_limit, ...
)
SELECT policy_id, benefit_code, daily_limit, annual_limit, ...
FROM benefit_level
WHERE catalog_id = policy.package.catalog_id
```

#### Benefit Usage Tracking

**Usage Record** (`policy_benefit_usage`)
```javascript
{
  policy_member_id: 789,
  benefit_code: "room_board",
  claim_id: 456,
  used_amount: 1500.00,
  usage_date: "2026-03-15",
  period: "2026"
}
```

**Usage Events** (`policy_benefit_usage_event`)
- Increment usage when claim approved
- Decrement if claim later rejected
- Track daily/annual/lifetime consumption

**Checks Before Claim Approval:**
```javascript
// Check annual limit
current_usage = SUM(usage WHERE period = current_year)
if (current_usage + new_claim_amount > annual_limit) {
  reject("Annual limit exceeded")
}

// Check lifetime limit
lifetime_usage = SUM(usage WHERE benefit_code = X)
if (lifetime_usage + new_claim_amount > lifetime_limit) {
  reject("Lifetime limit exceeded")
}
```

---

## How It Works - User Journey

### Journey 1: New Member Joins

```
1. User Registration
   ├─ Sign up via web/mobile
   ├─ Verify email/phone (verification_status)
   ├─ Complete KYC (kyc, person_identity)
   ├─ Upload ID documents (file_upload)
   └─ Accept terms (guideline_acceptance)

2. Policy Application
   ├─ Browse packages (policy_package)
   ├─ Select coverage level
   ├─ Add dependents (person, person_relationship)
   ├─ Answer health questions (survey, survey_response)
   └─ Submit application

3. Underwriting (if needed)
   ├─ Medical review (medical_underwriting_case)
   ├─ Upload medical reports (medical_underwriting_evidence)
   ├─ Decision by underwriter (medical_underwriting_outcome)
   └─ Terms applied (medical_underwriting_term)

4. Payment & Activation
   ├─ Calculate deposit (policy_deposit_requirement)
   ├─ Pay via payment gateway (payment_intent)
   ├─ Deposit credited to wallet (wallet)
   ├─ Policy activated (policy.status = 'active')
   └─ Welcome email sent (notification_message)

5. Onboarding
   ├─ Complete onboarding steps (onboarding_progress)
   ├─ Set notification preferences (notification_preference)
   └─ Earn welcome mission reward (mission_assignment)
```

### Journey 2: Member Files a Claim

```
1. Incident Occurs
   ├─ Member hospitalized
   ├─ Receives treatment
   └─ Collects hospital bills

2. Claim Submission
   ├─ Login to app
   ├─ Create claim (claim_case)
   ├─ Enter details (hospital, diagnosis, dates)
   ├─ Upload bills (claim_document, file_upload)
   └─ Submit for review

3. Initial Processing
   ├─ System assigns claim number (claim_case_number_sequence)
   ├─ Fraud checks run (claim_fraud_signal)
   ├─ Documents scanned (file_scan_result)
   └─ Assigned to reviewer (claim_review)

4. Medical Review
   ├─ Medical team creates case (medical_case)
   ├─ Reviews diagnosis & treatment
   ├─ Validates hospital (medical_provider)
   ├─ Checks benefit eligibility (policy_benefit_entitlement)
   └─ Checks usage limits (policy_benefit_usage)

5. Decision
   ├─ If approved:
   │   ├─ Set approved_amount (may differ from requested)
   │   ├─ Record usage (policy_benefit_usage)
   │   ├─ Add to current crowd period (crowd_period_claim)
   │   └─ Status → 'approved'
   └─ If rejected:
       ├─ Record rejection_reason
       └─ Status → 'rejected'

6. Payment
   ├─ Claim included in period calculation
   ├─ Period closes and settles
   ├─ Payout created (crowd_claim_payout)
   ├─ Money transferred to claimant
   ├─ Receipt generated (payment_receipt)
   └─ Notification sent (notification_message)

7. Post-Settlement
   ├─ Claim status → 'paid'
   ├─ Audit logged (audit_log)
   └─ Case closed
```

### Journey 3: Monthly Contribution Cycle

```
1. Month Ends
   └─ System creates crowd_period for closed month

2. Period Calculation (crowd_period_run)
   ├─ Collect all approved claims (crowd_period_claim)
   ├─ Sum total required: case_required_amount
   ├─ Get active members count
   ├─ Calculate per-member share
   ├─ Adjust for previous surplus/deficit
   └─ Generate member charges (crowd_member_charge)

3. Collection
   ├─ For each member:
   │   ├─ Create payment intent
   │   ├─ Charge payment method
   │   ├─ Record attempt (payment_attempt)
   │   └─ Update ledger (ledger_txn, ledger_entry)
   ├─ Handle failures:
   │   ├─ Retry auto-debit
   │   ├─ Send payment reminder (notification_message)
   │   └─ Grace period before suspension
   └─ Sum total collected

4. Disbursement
   ├─ Transfer to claimants (crowd_claim_payout)
   ├─ Update claim status → 'paid'
   └─ Record ledger entries

5. Reconciliation
   ├─ Calculate surplus/deficit
   ├─ If surplus → credit to member deposits or next period
   ├─ If deficit → carry forward or deduct from deposits
   ├─ Update period status → 'completed'
   └─ Generate period report

6. Notification
   ├─ Email contribution receipt to members
   ├─ Show breakdown in app
   └─ Next period begins
```

---

## Revenue & Financial Model

### Revenue Streams

#### 1. **Platform Fees** (Primary)
- Small % deducted from monthly contributions
- Example: 3-5% of total contributions
- Covers operational costs

#### 2. **Deposit Float Income**
- Interest earned on member deposits
- Members' deposits held in interest-bearing accounts
- Platform keeps interest (disclosed upfront)

#### 3. **Premium Loading** (Risk Adjustment)
- Higher-risk members pay additional premium
- Determined during underwriting
- Example: +20% for pre-existing conditions

#### 4. **Service Fees**
- Document processing: 10 MYR per claim
- Rush processing: 50 MYR
- Additional card fees: 2%
- Replacement card: 20 MYR

#### 5. **Partnership Commissions**
- Hospital network discounts → platform gets % of savings
- Pharmacy partnerships
- Telemedicine integration fees

#### 6. **Investment Returns**
- Reserve fund investments
- Conservative: bonds, fixed deposits
- Returns supplement revenue

### Cost Structure

#### 1. **Claim Payouts** (Variable)
- Directly passed to members via contributions
- Platform is pass-through

#### 2. **Technology & Infrastructure**
- Cloud hosting (AWS/GCP)
- Development team
- Database costs
- Security tools

#### 3. **Operations**
- Customer service team
- Claims reviewers
- Medical underwriters
- Fraud investigators

#### 4. **Sales & Marketing**
- Agent commissions (see Commission section)
- Digital advertising
- Referral rewards
- Mission rewards

#### 5. **Compliance & Legal**
- Regulatory compliance
- Audits
- Legal counsel
- Licenses

#### 6. **Finance & Admin**
- Accounting
- Payment gateway fees (2-3%)
- Banking fees
- Office overhead

### Financial Sustainability

**Unit Economics (per policy/year):**
```
Average annual contribution: 1,800 MYR
Platform fee (5%): 90 MYR
Deposit interest (3% on 2,000 MYR): 60 MYR
Service fees: 20 MYR

Total Revenue per Policy: 170 MYR/year

Costs per Policy:
- Agent commission: 60 MYR
- Technology: 20 MYR
- Operations: 30 MYR
- Payment fees: 10 MYR
Total Cost: 120 MYR/year

Net Margin: 50 MYR/year (29%)
```

**Break-even:** ~5,000 active policies

---

## Growth & Engagement Systems

### 1. **Referral Program** (`referral_program`)

**How It Works:**
1. Member generates unique code (`referral_code`)
2. Shares with friends/family
3. Friend signs up using code (`referral_invite`)
4. Referral tracked in chain (`referral_chain`)
5. When friend becomes active → conversion (`referral_conversion`)
6. Referrer earns reward (`referral_reward_grant`)

**Reward Tiers:**
```javascript
referral_rule: {
  tier: "bronze",
  conditions: { min_friends: 1, min_active_days: 30 },
  reward: { type: "wallet_credit", amount: 50 }
},
referral_rule: {
  tier: "silver",
  conditions: { min_friends: 5, min_premium_paid: 500 },
  reward: { type: "discount", amount: 100 }
},
referral_rule: {
  tier: "gold",
  conditions: { min_friends: 10, min_claims_submitted: 1 },
  reward: { type: "free_month", value: 1 }
}
```

### 2. **Mission System** (`mission_definition`)

Gamification to drive engagement.

**Mission Types:**

**Onboarding Missions:**
- Complete profile → 20 coins
- Upload profile photo → 10 coins
- Verify phone number → 15 coins
- Complete first health survey → 50 coins

**Engagement Missions:**
- Login 7 days straight → 100 coins
- Refer 3 friends → 200 coins
- Submit preventive health checkup → 300 coins
- Pay on time for 6 months → 500 coins

**Community Missions:**
- Review a medical provider → 25 coins
- Answer community health question → 15 coins
- Share health tip → 10 coins

**Mission Workflow:**
```
1. Mission Created (mission_definition)
2. Assigned to User (mission_assignment)
3. User Completes Task
4. Progress Tracked (mission_progress)
5. User Submits Proof (mission_submission)
6. Admin Reviews (if manual)
7. Approved → Reward Granted (mission_reward_grant)
8. Coins Added to Wallet
```

**Coin Economy:**
- Coins stored in user wallet
- Redeemable for:
  - Contribution discounts
  - Gift cards
  - Charitable donations
  - Premium features

### 3. **Discount Programs** (`discount_program`)

**Types:**
1. **Early Bird**: Sign up in first week → 10% off first year
2. **Family Plan**: 3+ members → 15% discount
3. **Health Champion**: No claims for 2 years → 20% renewal discount
4. **Student**: Full-time students → 25% off
5. **Corporate**: Company partnerships → custom rates

**Application:**
```sql
-- Discount applied at policy creation
INSERT INTO policy_discount_applied (
  policy_id, discount_program_id, discount_amount
)

-- Reflected in billing
policy_billing_plan.total_amount = base_amount - discount_amount
```

---

## Risk Management & Compliance

### 1. **Fraud Detection** (`claim_fraud_signal`)

**Red Flags:**
- Duplicate claims (same hospital, date, amount)
- Suspicious patterns (claims immediately after joining)
- Excessive usage (hitting limits too fast)
- Document tampering (detected by `file_scan_result`)

**Workflow:**
```javascript
// Automatic checks
if (claim.admission_date < policy.start_at.addDays(30)) {
  create_fraud_signal({
    type: "early_claim",
    severity: "medium",
    description: "Claim within 30 days of policy start"
  })
}

if (similar_claims.count > 0) {
  create_fraud_signal({
    type: "duplicate_suspected",
    severity: "high",
    description: "Similar claim found for same person/date"
  })
}

// Manual investigation
if (fraud_signals.severity == 'high') {
  assign_to_fraud_team()
  claim.status = 'under_investigation'
}
```

### 2. **Financial Controls**

**Wallet Thresholds** (`wallet_threshold_rule`, `wallet_threshold_event`)
```javascript
// Alert when deposit drops below threshold
wallet_threshold_rule: {
  wallet_type: "policy",
  threshold_type: "min_balance",
  threshold_value: 500.00,
  action: "send_alert"
}

// When triggered
wallet_threshold_event: {
  wallet_id: 123,
  current_balance: 480.00,
  threshold_value: 500.00,
  action_taken: "notification_sent"
}
```

**Spend Limits** (`wallet_rule`)
- Max withdrawal per day
- Max contribution charge per month
- Velocity checks (too many transactions)

**Policy Gates** (`wallet_policy_gate`)
- Prevent withdrawal if policy has pending claims
- Lock deposits during underwriting
- Freeze wallets under investigation

### 3. **Audit & Compliance**

**Audit Log** (`audit_log`)
- Every sensitive action logged
- Immutable record
- Fields: actor, action, resource, before/after, timestamp

**Event Sourcing** (`outbox_event`)
- All domain events published
- Enables event replay
- Supports analytics and audits

**File Security**
- Virus scanning (`file_scan_result`)
- Access tokens (`file_access_token`) - time-limited URLs
- Encryption at rest
- Tags for classification (`file_tag`, `file_upload_tag`)

---

## Technology Architecture

### Data Domains (Microservices/Modules)

Based on the database schema, the platform is organized into these domains:

#### 1. **Identity & Access**
- Tables: `user`, `person`, `account`, `user_credential`, `role`, `permission`
- Purpose: Authentication, authorization, user management
- Key Operations: Login, signup, password reset, role assignment

#### 2. **Policy Management**
- Tables: `policy`, `policy_package`, `policy_member`, `policy_benefit_entitlement`
- Purpose: Core policy lifecycle
- Key Operations: Create policy, renew, cancel, add members

#### 3. **Claims Processing**
- Tables: `claim_case`, `claim_review`, `claim_event`, `claim_settlement_flag`
- Purpose: Handle medical claims
- Key Operations: Submit claim, review, approve, pay

#### 4. **Crowdfunding Engine**
- Tables: `crowd_period`, `crowd_period_member`, `crowd_period_claim`, `crowd_member_charge`
- Purpose: Monthly contribution calculation and collection
- Key Operations: Calculate period, charge members, settle claims

#### 5. **Financial Services**
- Tables: `wallet`, `ledger_txn`, `ledger_entry`, `payment_intent`, `payment_method`
- Purpose: Money movement and accounting
- Key Operations: Deposit, withdraw, transfer, reconcile

#### 6. **Commission Management**
- Tables: `commission_program`, `commission_participant`, `commission_accrual`, `commission_payout_batch`
- Purpose: Agent compensation
- Key Operations: Calculate commission, process payouts

#### 7. **Missions & Engagement**
- Tables: `mission_definition`, `mission_assignment`, `mission_progress`, `mission_reward_grant`
- Purpose: Gamification
- Key Operations: Assign mission, track progress, grant rewards

#### 8. **Referral & Growth**
- Tables: `referral_program`, `referral_code`, `referral_invite`, `referral_conversion`
- Purpose: Viral growth
- Key Operations: Generate code, track referrals, reward referrers

#### 9. **Medical Services**
- Tables: `medical_provider`, `medical_case`, `medical_underwriting_case`
- Purpose: Medical expertise and risk assessment
- Key Operations: Review claims, underwrite risks, validate providers

#### 10. **Notifications**
- Tables: `notification_template`, `notification_message`, `notification_delivery_attempt`
- Purpose: Multi-channel communications
- Key Operations: Send email, SMS, push; track delivery

#### 11. **File Management**
- Tables: `file_upload`, `file_version`, `file_scan_result`, `file_access_token`
- Purpose: Document storage and security
- Key Operations: Upload, scan, version, serve

#### 12. **Compliance & Audit**
- Tables: `audit_log`, `outbox_event`, `kyc`, `guideline_acceptance`
- Purpose: Regulatory compliance and traceability
- Key Operations: Log actions, emit events, verify identity

---

### Key Architectural Patterns

#### 1. **Event-Driven Architecture**
- `outbox_event`: Reliable event publishing
- `outbox_event_consumer`: Track which consumers processed which events
- Enables: Async processing, decoupling, scalability

#### 2. **Ledger Pattern (Double-Entry Accounting)**
```
ledger_txn (transaction)
  ├─ ledger_entry (debit side)
  └─ ledger_entry (credit side)

Always balanced: SUM(debits) = SUM(credits)
```

#### 3. **Polymorphic Associations**
- `owner_type` + `owner_id` (e.g., in `wallet`, `address`, `file_link`)
- Allows flexible relationships: wallet belongs to user OR policy OR system

#### 4. **Versioning**
- `version` column in `claim_case`, `benefit_catalog`, `survey_version`
- Tracks changes over time
- Enables rollback and history

#### 5. **Idempotency**
- `idempotency_key` in many tables (e.g., `mission_event`, `ledger_txn`)
- Prevents duplicate processing
- Critical for payment operations

#### 6. **Soft Deletes**
- Many tables have `status` instead of actual deletion
- Preserves audit trail
- Example: `policy.status = 'cancelled'` not `DELETE FROM policy`

#### 7. **Temporal Data**
- `effective_from`, `effective_to` for time-bounded rules
- `created_at`, `updated_at` for tracking changes
- `occurred_at` for actual event time vs processing time

---

## Key Business Metrics

### Growth Metrics

1. **Member Acquisition**
   - New signups per month
   - Activation rate (signup → active policy)
   - Source: Referral vs Organic vs Agent

2. **Retention**
   - Monthly churn rate
   - Policy renewal rate
   - Average policy lifetime

3. **Referral Effectiveness**
   - Referral conversion rate
   - Average referrals per member
   - Viral coefficient (K-factor)

### Financial Metrics

1. **Revenue**
   - Monthly Recurring Revenue (MRR)
   - Average Revenue Per User (ARPU)
   - Lifetime Value (LTV)

2. **Claims Performance**
   - Loss Ratio: Claims Paid ÷ Contributions Collected
   - Target: 70-80% (rest is operational buffer)
   - Claims per 1000 members

3. **Financial Health**
   - Total deposits held
   - Reserve fund balance
   - Surplus/Deficit trend

### Operational Metrics

1. **Claims Processing**
   - Average claim approval time
   - Claim approval rate
   - Claim rejection reasons (Top 5)

2. **Customer Service**
   - First response time
   - Resolution time
   - Customer satisfaction (CSAT)

3. **Payment Success**
   - Payment success rate
   - Payment retry effectiveness
   - Overdue contributions

### Engagement Metrics

1. **App Usage**
   - Daily Active Users (DAU)
   - Monthly Active Users (MAU)
   - Session duration

2. **Mission Completion**
   - Mission completion rate
   - Average missions per user
   - Top rewarding missions

3. **Community Health**
   - Member survey responses
   - Guideline acceptance rate
   - Net Promoter Score (NPS)

---

## Conclusion

**GC_Pro** is not just another insurance platform - it's a **community-powered health safety net** that combines:

✅ **Transparency**: Members see exactly what they pay for
✅ **Affordability**: Pay only for actual claims, not inflated premiums
✅ **Community**: Mutual support during medical emergencies
✅ **Flexibility**: Deposit model allows members to retain value
✅ **Engagement**: Gamification drives healthy behaviors
✅ **Growth**: Viral referrals expand the community
✅ **Technology**: Modern platform enabling efficiency at scale

### The Vision

To create the **largest community health safety net** in the region, where:
- Millions of members support each other
- Medical costs are shared fairly
- Health is incentivized through missions
- Growth is organic through referrals
- Technology makes it seamless

### Next Steps for Understanding

To go deeper:
1. **Read the pillar specs**: `specs/mission/`, `specs/commission/`
2. **Study the workflows**: `src/plugins/missions/README.md`
3. **Review the code**: Controllers → Services → Repositories
4. **Explore the data**: Run queries on the database
5. **Test the APIs**: Use the Postman collection

---

**Questions or need clarification on any section?** This is a living document - it will grow as the platform evolves.
