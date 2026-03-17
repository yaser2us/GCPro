# E2E Flow Implementation Plan
## Commission, Referral, Payment, Policy Pillars

**Created:** 2026-03-17
**Goal:** Complete end-to-end insurance business flow
**Timeline:** 8-12 weeks
**Status:** Planning Phase

---

## Executive Summary

### The 4 Pillars

| # | Pillar | Tables | Complexity | Timeline | Priority |
|---|--------|--------|------------|----------|----------|
| 1 | **Payment** | 7 | Medium | 2-3 weeks | CRITICAL |
| 2 | **Policy** | 18 | High | 4-6 weeks | CRITICAL |
| 3 | **Commission** | 7 | Medium | 2-3 weeks | HIGH |
| 4 | **Referral** | 7 | Low-Medium | 1-2 weeks | HIGH |

**Total:** 39 tables, 8-12 weeks

---

## End-to-End User Journey

### Complete Flow (What We're Building)

```
┌─────────────────────────────────────────────────────────────────┐
│                    1. USER REGISTRATION                         │
│  Pillar: User ✅                                                │
│  - User signs up                                                │
│  - Creates profile (Person ✅)                                  │
│  - Gets wallet (Wallet ✅)                                      │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│                    2. REFERRAL (Optional)                       │
│  Pillar: Referral ⏳                                            │
│  - User A refers User B via referral code                       │
│  - User B signs up with referral code                           │
│  - Referral tracked in referral_chain                           │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│                    3. POLICY PURCHASE                           │
│  Pillar: Policy ⏳                                              │
│  - User selects insurance package                               │
│  - Provides member details                                      │
│  - Configures coverage                                          │
│  - Policy created (status: pending_payment)                     │
│  Event: POLICY_CREATED                                          │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│                    4. PAYMENT PROCESSING                        │
│  Pillar: Payment ⏳                                             │
│  - Payment intent created                                       │
│  - User pays premium via payment gateway                        │
│  - Payment confirmed                                            │
│  Event: PAYMENT_COMPLETED                                       │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│                    5. POLICY ACTIVATION                         │
│  Pillar: Policy ⏳                                              │
│  Consumer: Listens to PAYMENT_COMPLETED                         │
│  - Policy status → active                                       │
│  - Coverage starts                                              │
│  Event: POLICY_ACTIVATED                                        │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│                 6. COMMISSION CALCULATION                       │
│  Pillar: Commission ⏳                                          │
│  Consumer: Listens to POLICY_ACTIVATED                          │
│  - Calculate agent/partner commission                           │
│  - Create commission_accrual                                    │
│  Event: COMMISSION_CALCULATED                                   │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│                 7. COMMISSION PAYOUT                            │
│  Pillar: Commission ⏳                                          │
│  - Batch commission payouts monthly                             │
│  - Pay to agent wallet or bank                                  │
│  Event: COMMISSION_PAID                                         │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│                 8. REFERRAL REWARD (If Applicable)              │
│  Pillar: Referral ⏳                                            │
│  Consumer: Listens to POLICY_ACTIVATED                          │
│  - Mark referral as converted                                   │
│  - Grant referral reward to User A                              │
│  Event: REFERRAL_REWARD_GRANTED                                 │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│                 9. WALLET CREDIT (Referral Reward)              │
│  Pillar: Wallet ✅                                              │
│  Consumer: Listens to REFERRAL_REWARD_GRANTED                   │
│  - Credit User A's wallet                                       │
│  Event: WALLET_CREDITED                                         │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│                 10. ONGOING BILLING                             │
│  Pillar: Policy ⏳ + Payment ⏳                                 │
│  - Generate installment invoices                                │
│  - Process recurring payments                                   │
│  - Track payment status                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Order & Dependencies

### Phase 1: Payment Foundation (Weeks 1-3)

**Why First:**
- Required by Policy
- No dependencies on other new pillars
- Critical for revenue

**Depends On:**
- ✅ User (existing)
- ✅ Person (existing)

---

### Phase 2: Policy Core (Weeks 4-9)

**Why Second:**
- Core business logic
- Depends on Payment
- Required by Commission and Referral

**Depends On:**
- ✅ User (existing)
- ✅ Person (existing)
- ✅ Payment (Phase 1)

---

### Phase 3: Commission & Referral (Weeks 10-12)

**Why Together:**
- Both depend on Policy
- Both event-driven (similar pattern)
- Can be developed in parallel

**Commission Depends On:**
- ✅ Wallet (existing)
- ✅ Policy (Phase 2)

**Referral Depends On:**
- ✅ User (existing)
- ✅ Wallet (existing)
- ✅ Policy (Phase 2)

---

## Detailed Pillar Plans

---

## 1. PAYMENT PILLAR

### Overview
**Timeline:** 2-3 weeks
**Tables:** 7
**Complexity:** Medium
**Priority:** CRITICAL

### Tables

```sql
payment_intent           -- Payment tracking
payment_method          -- Credit cards, bank accounts
payment_attempt         -- Payment tries (retries)
payment_receipt         -- Proof of payment
payment_event           -- Payment lifecycle events
payment_webhook_inbox   -- Gateway webhooks
bank_profile           -- Bank account details
```

### Features

#### Phase 1A: Core Payment (Week 1)
- [ ] Create payment intent
- [ ] Payment method management
- [ ] Payment status tracking
- [ ] Basic webhook handling

#### Phase 1B: Gateway Integration (Week 2)
- [ ] Stripe integration (or local gateway)
- [ ] Webhook processing
- [ ] Receipt generation
- [ ] Retry logic

#### Phase 1C: Advanced Features (Week 3)
- [ ] Recurring billing setup
- [ ] Payment method tokenization
- [ ] Refund processing
- [ ] Payment analytics

### Event-Driven Architecture

**Event Consumers:**
```typescript
// None initially - Payment is a producer
```

**Event Producers:**
```typescript
PAYMENT_INITIATED         // Payment intent created
PAYMENT_PROCESSING        // Payment submitted to gateway
PAYMENT_COMPLETED         // Payment successful
PAYMENT_FAILED            // Payment failed
PAYMENT_REFUNDED          // Payment refunded
```

### File Structure

```
src/plugins/payment/
├── controllers/
│   ├── payment.controller.ts           // HTTP endpoints
│   └── webhook.controller.ts           // Gateway webhooks
│
├── services/
│   ├── payment.service.ts              // Core payment ops
│   ├── payment-method.service.ts       // Payment methods
│   └── gateway.service.ts              // Gateway integration
│
├── gateways/                            // NEW: Gateway adapters
│   ├── stripe.gateway.ts
│   └── gateway.interface.ts
│
├── repositories/
│   ├── payment-intent.repo.ts
│   ├── payment-method.repo.ts
│   ├── payment-attempt.repo.ts
│   └── payment-receipt.repo.ts
│
├── entities/
│   ├── payment-intent.entity.ts
│   ├── payment-method.entity.ts
│   ├── payment-attempt.entity.ts
│   ├── payment-receipt.entity.ts
│   └── payment-event.entity.ts
│
├── dto/
│   ├── payment-create.request.dto.ts
│   ├── payment-method.request.dto.ts
│   └── webhook.dto.ts
│
└── payment.module.ts
```

### API Endpoints

```typescript
POST   /v1/payments/intents              // Create payment intent
GET    /v1/payments/intents/:id          // Get payment intent
POST   /v1/payments/intents/:id/confirm  // Confirm payment

POST   /v1/payment-methods               // Add payment method
GET    /v1/payment-methods               // List payment methods
DELETE /v1/payment-methods/:id           // Remove payment method

POST   /v1/payments/webhooks/stripe      // Stripe webhook
POST   /v1/payments/webhooks/ipay88      // iPay88 webhook (Malaysia)

GET    /v1/payments/receipts/:id         // Get receipt
```

### Integration Points

**Payment Gateways:**
- Stripe (International)
- iPay88 (Malaysia)
- FPX (Malaysia bank transfer)

**Webhook Flow:**
```
Gateway → Webhook Endpoint → Validate Signature
  → Save to payment_webhook_inbox
  → Process webhook
  → Update payment_intent status
  → Emit PAYMENT_COMPLETED event
```

---

## 2. POLICY PILLAR

### Overview
**Timeline:** 4-6 weeks
**Tables:** 18
**Complexity:** High
**Priority:** CRITICAL

### Tables

```sql
-- Core Policy
policy                      -- Main policy record
policy_member              -- Covered persons
policy_status_event        -- Status history

-- Coverage & Benefits
policy_package             -- Coverage packages
policy_package_rate        -- Premium rates
policy_benefit_entitlement -- Benefit limits per member
policy_benefit_usage       -- Benefit usage tracking
policy_benefit_usage_event -- Usage history

-- Billing
policy_billing_plan        -- Billing schedule
policy_installment         -- Payment installments
policy_deposit_requirement -- Deposit tracking

-- Pricing & Discounts
policy_discount_applied    -- Applied discounts
age_band                   -- Age-based pricing
smoker_profile             -- Smoking status pricing

-- Catalogs
benefit_catalog            -- Available benefits
benefit_catalog_item       -- Catalog items
benefit_level              -- Benefit tiers

-- Issues
policy_remediation_case    -- Policy issues/corrections
```

### Features

#### Phase 2A: Core Policy Management (Weeks 4-5)
- [ ] Policy creation
- [ ] Member management
- [ ] Package selection
- [ ] Status management (pending → active → cancelled)
- [ ] Policy numbering

#### Phase 2B: Premium Calculation (Week 6)
- [ ] Age-based pricing
- [ ] Smoker/non-smoker rates
- [ ] Coverage level multipliers
- [ ] Discount application
- [ ] Premium calculation engine

#### Phase 2C: Billing Integration (Week 7)
- [ ] Billing plan creation
- [ ] Installment generation
- [ ] Payment integration (consume PAYMENT_COMPLETED)
- [ ] Deposit tracking

#### Phase 2D: Benefit Management (Week 8-9)
- [ ] Benefit catalog setup
- [ ] Benefit entitlement calculation
- [ ] Benefit usage tracking
- [ ] Benefit limit enforcement

### Event-Driven Architecture

**Event Consumers:**
```typescript
PAYMENT_COMPLETED → PolicyPaymentHandler
  - Activate policy if first payment
  - Update installment status
  - Emit POLICY_ACTIVATED

USER_REGISTERED → PolicyOnboardingHandler (future)
  - Create suggested packages
```

**Event Producers:**
```typescript
POLICY_CREATED        // Policy record created
POLICY_ACTIVATED      // First payment received, coverage starts
POLICY_RENEWED        // Renewal processed
POLICY_CANCELLED      // Policy cancelled
POLICY_LAPSED         // Payment missed, policy lapsed
INSTALLMENT_DUE       // Payment due reminder
BENEFIT_LIMIT_REACHED // Member reached benefit limit
```

### File Structure

```
src/plugins/policy/
├── controllers/
│   ├── policy.controller.ts
│   ├── policy-package.controller.ts
│   └── benefit.controller.ts
│
├── services/
│   ├── policy.service.ts               // Core policy ops
│   ├── premium.service.ts              // Premium calculation
│   ├── billing.service.ts              // Billing & installments
│   └── benefit.service.ts              // Benefit management
│
├── handlers/
│   └── payment-completed.handler.ts    // Activate policy on payment
│
├── consumers/
│   └── payment-completed.consumer.ts
│
├── engines/                             // NEW: Business logic engines
│   ├── premium-calculator.engine.ts    // Premium calculation rules
│   └── benefit-evaluator.engine.ts     // Benefit eligibility
│
├── repositories/
│   ├── policy.repo.ts
│   ├── policy-member.repo.ts
│   ├── policy-package.repo.ts
│   ├── benefit-entitlement.repo.ts
│   └── ... (one per entity)
│
├── entities/
│   └── ... (18 entities)
│
├── dto/
│   ├── policy-create.request.dto.ts
│   ├── policy-add-member.request.dto.ts
│   ├── premium-quote.request.dto.ts
│   └── ...
│
└── policy.module.ts
```

### API Endpoints

```typescript
// Policy Management
POST   /v1/policies                      // Create policy
GET    /v1/policies                      // List policies
GET    /v1/policies/:id                  // Get policy details
PUT    /v1/policies/:id                  // Update policy
POST   /v1/policies/:id/activate         // Activate policy
POST   /v1/policies/:id/cancel           // Cancel policy

// Members
POST   /v1/policies/:id/members          // Add member
PUT    /v1/policies/:id/members/:mid     // Update member
DELETE /v1/policies/:id/members/:mid     // Remove member

// Premium & Quotes
POST   /v1/policies/quotes               // Get premium quote
GET    /v1/policies/:id/premium          // Get policy premium

// Benefits
GET    /v1/policies/:id/benefits         // List benefits
GET    /v1/policies/:id/benefits/usage   // Benefit usage
POST   /v1/policies/:id/benefits/claim   // Use benefit (future: links to Claim)

// Billing
GET    /v1/policies/:id/installments     // List installments
GET    /v1/policies/:id/billing-plan     // Get billing plan

// Packages
GET    /v1/policy-packages               // List available packages
GET    /v1/policy-packages/:id           // Get package details
```

### Premium Calculation Example

```typescript
interface PremiumCalculationInput {
  package_code: string;      // e.g., "FAMILY_PLUS"
  members: {
    age: number;
    smoker: boolean;
    relationship: string;    // self, spouse, child
  }[];
  coverage_level: number;    // 1x, 2x, 3x multiplier
  payment_frequency: string; // monthly, quarterly, annual
  discount_codes?: string[]; // Promo codes
}

// Premium = Base Rate × Age Factor × Smoker Factor × Coverage × Members
// - Discount
```

---

## 3. COMMISSION PILLAR

### Overview
**Timeline:** 2-3 weeks
**Tables:** 7
**Complexity:** Medium
**Priority:** HIGH

### Tables

```sql
commission_program             -- Commission programs
commission_rule                -- Calculation rules
commission_participant         -- Agents/partners
commission_accrual             -- Earned commissions
commission_payout_batch        -- Payout batches
commission_payout_item         -- Individual payouts
commission_payout_item_accrual -- Payout-accrual links
```

### Features

#### Phase 3A: Core Commission (Week 10)
- [ ] Commission program management
- [ ] Rule engine (percentage, flat, tiered)
- [ ] Participant management
- [ ] Commission calculation

#### Phase 3B: Accrual Tracking (Week 11)
- [ ] Listen to POLICY_ACTIVATED events
- [ ] Calculate commission based on rules
- [ ] Create commission_accrual
- [ ] Track accrual status

#### Phase 3C: Payout Processing (Week 12)
- [ ] Batch commission payouts (monthly)
- [ ] Generate payout batches
- [ ] Integrate with Wallet for payment
- [ ] Payout confirmation

### Event-Driven Architecture

**Event Consumers:**
```typescript
POLICY_ACTIVATED → CommissionCalculationHandler
  - Calculate agent commission
  - Create commission_accrual
  - Emit COMMISSION_CALCULATED

POLICY_RENEWED → CommissionRenewalHandler
  - Calculate renewal commission
  - Lower rate than initial

POLICY_CANCELLED → CommissionReversalHandler (within clawback period)
  - Reverse commission if policy cancelled early
```

**Event Producers:**
```typescript
COMMISSION_CALCULATED  // Commission calculated and accrued
COMMISSION_ACCRUED     // Commission ready for payout
COMMISSION_PAID        // Commission paid to agent
PAYOUT_BATCH_CREATED   // Monthly payout batch created
```

### File Structure

```
src/plugins/commission/
├── controllers/
│   ├── commission.controller.ts
│   ├── commission-program.controller.ts
│   └── payout.controller.ts
│
├── services/
│   ├── commission.service.ts           // Core commission ops
│   ├── calculation.service.ts          // Commission calculation
│   └── payout.service.ts               // Batch payout processing
│
├── handlers/
│   ├── policy-activated.handler.ts     // Calculate on policy activation
│   └── policy-renewed.handler.ts       // Calculate on renewal
│
├── consumers/
│   ├── policy-activated.consumer.ts
│   └── policy-renewed.consumer.ts
│
├── engines/
│   └── commission-calculator.engine.ts // Rule-based calculation
│
├── repositories/
│   ├── commission-program.repo.ts
│   ├── commission-rule.repo.ts
│   ├── commission-accrual.repo.ts
│   └── commission-payout.repo.ts
│
├── entities/
│   └── ... (7 entities)
│
├── dto/
│   ├── commission-program-create.request.dto.ts
│   ├── payout-batch-create.request.dto.ts
│   └── ...
│
└── commission.module.ts
```

### API Endpoints

```typescript
// Programs
POST   /v1/commission-programs           // Create program
GET    /v1/commission-programs           // List programs
PUT    /v1/commission-programs/:id       // Update program

// Rules
POST   /v1/commission-programs/:id/rules // Add rule
PUT    /v1/commission-rules/:id          // Update rule

// Participants (Agents)
POST   /v1/commission-participants        // Register agent
GET    /v1/commission-participants        // List agents
GET    /v1/commission-participants/:id    // Agent details

// Accruals
GET    /v1/commissions/accruals           // List accruals
GET    /v1/commissions/accruals/:id       // Accrual details
GET    /v1/agents/:id/accruals            // Agent's commissions

// Payouts
POST   /v1/commission-payouts/batches     // Create payout batch
GET    /v1/commission-payouts/batches     // List batches
POST   /v1/commission-payouts/batches/:id/execute // Execute payout
GET    /v1/agents/:id/payouts             // Agent's payout history
```

### Commission Calculation Example

```typescript
interface CommissionRule {
  type: 'percentage' | 'flat' | 'tiered';
  value: number;           // e.g., 10 (means 10%)
  applies_to: string;      // 'first_year' | 'renewal' | 'all'
  clawback_period?: number; // Days (e.g., 90)
}

// Example: First year premium = $1,200
// Rule: 10% commission on first year
// Commission = $1,200 × 0.10 = $120

// If policy cancelled within 90 days → reverse commission
```

---

## 4. REFERRAL PILLAR

### Overview
**Timeline:** 1-2 weeks
**Tables:** 7
**Complexity:** Low-Medium
**Priority:** HIGH

### Tables

```sql
referral_program        -- Referral programs
referral_rule           -- Reward rules
referral_code           -- User referral codes
referral_invite         -- Invitations sent
referral_chain          -- Multi-level tracking
referral_conversion     -- Successful referrals
referral_reward_grant   -- Reward grants
referral_event          -- Referral lifecycle events
```

### Features

#### Phase 4A: Core Referral (Week 1)
- [ ] Generate referral codes
- [ ] Track referral invites
- [ ] Validate referral codes at signup
- [ ] Multi-level referral chains

#### Phase 4B: Conversion & Rewards (Week 2)
- [ ] Listen to POLICY_ACTIVATED events
- [ ] Mark referral as converted
- [ ] Calculate referral reward
- [ ] Grant reward to referrer's wallet
- [ ] Multi-level rewards (optional)

### Event-Driven Architecture

**Event Consumers:**
```typescript
USER_REGISTERED → ReferralTrackingHandler
  - Link user to referrer via referral_code
  - Create referral_chain entry

POLICY_ACTIVATED → ReferralConversionHandler
  - Mark referral as converted
  - Calculate referral reward
  - Create referral_reward_grant
  - Emit REFERRAL_REWARD_GRANTED
```

**Event Producers:**
```typescript
REFERRAL_CODE_GENERATED     // User gets referral code
REFERRAL_INVITE_SENT        // Invitation sent
REFERRAL_SIGNUP_COMPLETED   // Referee signed up
REFERRAL_CONVERSION         // Referee converted (bought policy)
REFERRAL_REWARD_GRANTED     // Reward granted to referrer
```

### File Structure

```
src/plugins/referral/
├── controllers/
│   ├── referral.controller.ts
│   └── referral-program.controller.ts
│
├── services/
│   ├── referral.service.ts             // Core referral ops
│   ├── referral-code.service.ts        // Code generation
│   └── reward.service.ts               // Reward calculation
│
├── handlers/
│   ├── user-registered.handler.ts      // Track signup
│   └── policy-activated.handler.ts     // Grant reward on conversion
│
├── consumers/
│   ├── user-registered.consumer.ts
│   └── policy-activated.consumer.ts
│
├── repositories/
│   ├── referral-code.repo.ts
│   ├── referral-chain.repo.ts
│   ├── referral-conversion.repo.ts
│   └── referral-reward.repo.ts
│
├── entities/
│   └── ... (7 entities)
│
├── dto/
│   ├── referral-invite.request.dto.ts
│   └── ...
│
└── referral.module.ts
```

### API Endpoints

```typescript
// User Referrals
GET    /v1/referrals/my-code             // Get my referral code
POST   /v1/referrals/invites             // Send invitation
GET    /v1/referrals/invites             // My invitations
GET    /v1/referrals/conversions         // My conversions
GET    /v1/referrals/rewards             // My referral rewards

// Admin
POST   /v1/referral-programs             // Create program
GET    /v1/referral-programs             // List programs
GET    /v1/referrals/stats               // Referral statistics

// Public
POST   /v1/auth/register?ref=ABC123      // Register with referral code
```

### Referral Flow Example

```typescript
// Step 1: User A gets referral code
referral_code: "JOHN2024"

// Step 2: User A shares with User B
// User B signs up with ?ref=JOHN2024

// Step 3: System creates referral_chain
{
  referrer_id: 1 (User A),
  referee_id: 2 (User B),
  referral_code: "JOHN2024",
  level: 1,
  status: "signup"
}

// Step 4: User B buys policy → POLICY_ACTIVATED event

// Step 5: ReferralConversionHandler
- Updates referral_chain status to "converted"
- Creates referral_reward_grant (e.g., 50 COIN)
- Emits REFERRAL_REWARD_GRANTED

// Step 6: WalletReferralRewardHandler
- Credits User A's wallet with 50 COIN
```

---

## Event Flow Diagram

### Complete E2E Event Chain

```
USER_REGISTERED (User ✅)
  ↓
  └─→ ReferralTrackingHandler (Referral)
      - Links user to referrer
      - Creates referral_chain

POLICY_CREATED (Policy)
  ↓
  └─→ PaymentIntentHandler (Payment)
      - Creates payment_intent
      - Emits PAYMENT_INITIATED

PAYMENT_COMPLETED (Payment)
  ↓
  ├─→ PolicyActivationHandler (Policy)
  │   - Activates policy
  │   - Emits POLICY_ACTIVATED
  │
  └─→ InstallmentUpdateHandler (Policy)
      - Updates installment status

POLICY_ACTIVATED (Policy)
  ↓
  ├─→ CommissionCalculationHandler (Commission)
  │   - Calculates agent commission
  │   - Creates commission_accrual
  │   - Emits COMMISSION_CALCULATED
  │
  └─→ ReferralConversionHandler (Referral)
      - Marks referral as converted
      - Creates referral_reward_grant
      - Emits REFERRAL_REWARD_GRANTED

REFERRAL_REWARD_GRANTED (Referral)
  ↓
  └─→ WalletReferralRewardHandler (Wallet)
      - Credits referrer's wallet
      - Emits WALLET_CREDITED

COMMISSION_CALCULATED (Commission)
  ↓
  └─→ CommissionPayoutBatchHandler (Commission - monthly cron)
      - Creates payout batch
      - Pays to agent wallet/bank
      - Emits COMMISSION_PAID
```

---

## Implementation Timeline

### Gantt Chart View

```
Week 1-3:   [████████████] Payment Pillar
              └─ Week 1: Core payment
              └─ Week 2: Gateway integration
              └─ Week 3: Recurring billing

Week 4-9:   [████████████████████████] Policy Pillar
              └─ Week 4-5: Core policy
              └─ Week 6:   Premium calculation
              └─ Week 7:   Billing integration
              └─ Week 8-9: Benefits

Week 10-12: [████████] Commission + [██████] Referral
              └─ Week 10: Commission core + Referral core
              └─ Week 11: Commission accrual + Referral conversion
              └─ Week 12: Commission payout + Referral rewards
```

### Parallel Work (Week 10-12)

**Developer A:** Commission Pillar
**Developer B:** Referral Pillar

Both can work in parallel since:
- Both depend on Policy (completed by Week 9)
- No dependency on each other
- Similar event-driven patterns

---

## Testing Strategy

### Unit Tests
- [ ] Service layer business logic
- [ ] Premium calculation engine
- [ ] Commission calculation engine
- [ ] Referral reward calculation

### Integration Tests
- [ ] Payment gateway integration
- [ ] Event flow (PAYMENT_COMPLETED → POLICY_ACTIVATED)
- [ ] Commission calculation on policy activation
- [ ] Referral reward on policy activation

### E2E Tests
- [ ] Complete user journey: Register → Refer → Buy Policy → Pay → Activate
- [ ] Verify: Policy active, Commission accrued, Referral reward granted
- [ ] Check: Wallet credited, Events emitted correctly

---

## Database Migration Strategy

### Order of Migrations

1. **Payment tables** (Week 1)
2. **Policy tables** (Week 4)
3. **Commission tables** (Week 10)
4. **Referral tables** (Week 10)

### Sample Migration

```sql
-- Week 1: Payment tables
CREATE TABLE payment_intent (...);
CREATE TABLE payment_method (...);
-- ...

-- Week 4: Policy tables
CREATE TABLE policy (...);
CREATE TABLE policy_member (...);
-- ...

-- Week 10: Commission + Referral tables
CREATE TABLE commission_program (...);
CREATE TABLE referral_code (...);
-- ...
```

---

## Risk Assessment

### High Risk
- **Payment gateway integration** - External dependency, complex webhooks
- **Premium calculation accuracy** - Business critical, complex rules
- **Data migration** - 39 new tables, relationships

**Mitigation:**
- Sandbox testing for payment gateway
- Extensive test coverage for premium calculation
- Careful schema design with foreign keys

### Medium Risk
- **Event delivery reliability** - Outbox pattern dependency
- **Commission calculation errors** - Financial impact
- **Multi-level referral complexity** - Edge cases

**Mitigation:**
- Outbox processor monitoring
- Commission calculation audit trail
- Limit referral levels initially (1-2 levels)

### Low Risk
- **Referral code generation** - Simple logic
- **Benefit catalog management** - CRUD operations

---

## Success Metrics

### Technical Metrics
- [ ] All 39 tables created and indexed
- [ ] 100% test coverage for financial calculations
- [ ] < 2% payment failure rate
- [ ] < 500ms average API response time
- [ ] 99.9% event delivery success

### Business Metrics
- [ ] Policy purchase flow completion rate > 80%
- [ ] Average time to activate policy < 5 minutes
- [ ] Commission payout accuracy 100%
- [ ] Referral conversion rate tracking enabled

---

## Post-Implementation

### Future Enhancements
- [ ] Policy renewals automation
- [ ] Commission tiering (bronze, silver, gold agents)
- [ ] Multi-level referral (2-3 levels)
- [ ] Dynamic pricing based on market
- [ ] Policy comparison tool

### Next Pillars After E2E
- Claim Pillar (claims processing)
- Medical Case Pillar (underwriting, medical assessment)
- Crowd Pillar (Takaful)

---

## Approval & Sign-Off

**Plan Created By:** GCPro Development Team
**Date:** 2026-03-17
**Estimated Completion:** Week 12
**Total Effort:** 8-12 weeks

**Ready to Start?** ✅

---

## Quick Reference: Event Catalog

| Event | Producer | Consumers | Payload |
|-------|----------|-----------|---------|
| `PAYMENT_COMPLETED` | Payment | Policy | payment_id, policy_id, amount |
| `POLICY_ACTIVATED` | Policy | Commission, Referral | policy_id, user_id, premium |
| `COMMISSION_CALCULATED` | Commission | - | accrual_id, agent_id, amount |
| `REFERRAL_REWARD_GRANTED` | Referral | Wallet | reward_grant_id, user_id, amount |
| `WALLET_CREDITED` | Wallet | - | wallet_id, amount, source |

---

**This plan creates a complete, production-ready insurance platform with payment, policies, commissions, and referrals! 🚀**

