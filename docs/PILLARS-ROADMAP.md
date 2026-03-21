# GCPro Pillars Implementation Roadmap

Based on `docs/database/FULL-DDL.md`

---

## 📊 Overview: 14 Total Pillars

### ✅ **IMPLEMENTED** (10 Pillars)

| # | Pillar | Tables | Status | Notes |
|---|--------|--------|--------|-------|
| 1 | **Referral** | 8 | ✅ Complete | V1 + V2 (Multi-level) |
| 2 | **Commission** | 7 | ⚠️ Partial | Core done, needs wallet integration |
| 3 | **Wallet/Ledger** | 16 | ⚠️ Partial | Core done, needs full features |
| 4 | **Mission** | 7 | ✅ Complete | Fully functional |
| 5 | **File** | 8 | ✅ Complete | Upload/download working |
| 6 | **Notification** | 6 | ✅ Complete | Templates & delivery |
| 7 | **Survey** | 7 | ✅ Complete | Questions & responses |
| 8 | **Identity/User** | 14 | ⚠️ Partial | User exists, no auth |
| 9 | **IAM/Permission** | 3 | ✅ Complete | Roles & permissions |
| 10 | **Foundation/Core** | 5 | ✅ Complete | Outbox, audit, etc. |

### ❌ **NOT IMPLEMENTED** (4 Major Pillars)

| # | Pillar | Tables | Priority | Business Value |
|---|--------|--------|----------|----------------|
| 11 | **Policy (Insurance)** | 13 | 🔥 HIGH | Core insurance functionality |
| 12 | **Claims** | 18 | 🔥 HIGH | Claims processing |
| 13 | **Crowd (Takaful)** | 10 | 🔴 MEDIUM | Islamic insurance model |
| 14 | **Payment** | 7 | 🔴 MEDIUM | Payment gateway integration |

---

## 🎯 NEXT PILLAR TO BUILD

### **Option A: Policy Pillar** 🏆 RECOMMENDED

**Why this is the most important:**
- **13 tables** - Core insurance functionality
- **Highest business value** - Without policies, no insurance business
- **Foundation for Claims** - Claims depend on policies
- **Most complex** - Better to build it properly now

**Tables:**
```sql
policy                          -- Core policy entity
policy_member                   -- Members covered by policy
policy_package                  -- Insurance packages
policy_package_rate             -- Premium rates
policy_benefit_entitlement      -- What benefits user is entitled to
policy_benefit_usage            -- Track benefit usage
policy_benefit_usage_event      -- Audit trail
policy_billing_plan             -- Payment plans
policy_deposit_requirement      -- Deposit rules
policy_discount_applied         -- Applied discounts
policy_installment              -- Payment installments
policy_status_event             -- Status change audit
policy_remediation_case         -- Issue resolution
```

**Key Features:**
1. Create insurance policy
2. Add members to policy
3. Select package and calculate premium
4. Apply discounts
5. Setup billing/installment plans
6. Track policy status changes
7. Benefit entitlement management
8. Usage tracking (for limits)

**Estimated Effort:** 1-2 weeks

---

### **Option B: Claims Pillar** 🏥

**Why this matters:**
- **18 tables** - Most complex pillar
- **Revenue driver** - Process claims for members
- **Depends on Policy** - Needs policy to validate claims

**Tables:**
```sql
claim_case                              -- Main claim case
claim_case_number_sequence              -- Auto-increment claim numbers
claim_document                          -- Supporting documents
claim_event                             -- Status change events
claim_fraud_signal                      -- Fraud detection
claim_link                              -- Link to policies/members
claim_review                            -- Reviewer comments
claim_settlement_flag                   -- Settlement status
guarantee_letter                        -- Hospital GL
medical_case                            -- Medical details
medical_case_event                      -- Medical audit trail
medical_provider                        -- Hospital/clinic info
medical_underwriting_case               -- Pre-existing conditions
medical_underwriting_current_outcome    -- Current underwriting status
medical_underwriting_evidence           -- Medical evidence
medical_underwriting_outcome            -- Underwriting decisions
medical_underwriting_term               -- Coverage terms
```

**Key Features:**
1. Submit claim
2. Upload documents
3. Assign reviewer
4. Medical underwriting
5. Fraud detection
6. Approve/reject claim
7. Settlement processing
8. Generate guarantee letters

**Estimated Effort:** 2-3 weeks

---

### **Option C: Crowd (Takaful) Pillar** 🤝

**Why this is interesting:**
- **10 tables** - Islamic insurance model
- **Unique business model** - Shared contribution pools
- **Complex calculations** - Period-based contributions

**Tables:**
```sql
crowd_period                    -- Monthly/yearly periods
crowd_period_claim              -- Claims in period
crowd_period_member             -- Members in period
crowd_period_event              -- Audit events
crowd_period_run                -- Calculation runs
crowd_period_run_lock           -- Concurrency control
crowd_contribution              -- Member contributions
crowd_member_charge             -- Charges to members
crowd_claim_payout              -- Payouts for claims
crowd_package_bucket            -- Package groupings
```

**Key Features:**
1. Create contribution periods
2. Calculate member contributions
3. Track claims per period
4. Distribute surplus/deficit
5. Package-based pooling
6. Fair contribution calculations

**Estimated Effort:** 1-2 weeks

---

### **Option D: Payment Pillar** 💳

**Why this enables everything:**
- **7 tables** - Payment gateway integration
- **Enables revenue** - Collect premiums, contributions
- **Required for production** - Can't launch without payments

**Tables:**
```sql
payment_intent                  -- Payment initiation
payment_attempt                 -- Retry logic
payment_method                  -- Saved payment methods
payment_receipt                 -- Receipts
payment_event                   -- Audit trail
payment_webhook_inbox           -- Webhook processing
bank_profile                    -- Bank account details
```

**Key Features:**
1. Create payment intents
2. Multiple payment methods
3. Webhook handling (Stripe, PayPal, etc.)
4. Retry failed payments
5. Generate receipts
6. Save payment methods
7. Refund processing

**Estimated Effort:** 1 week

---

## 🚀 RECOMMENDED BUILD ORDER

### **Phase 1: Core Insurance (4-6 weeks)**
1. ✅ **Referral V2** - Done!
2. ✅ **Commission** - 80% done
3. **Complete Commission-Wallet Integration** - 1-2 days ← START HERE
4. **Policy Pillar** - 1-2 weeks
5. **Payment Pillar** - 1 week
6. **Claims Pillar** - 2-3 weeks

### **Phase 2: Islamic Finance (2-3 weeks)**
7. **Crowd (Takaful) Pillar** - 1-2 weeks
8. **Advanced Claims Features** - 1 week

### **Phase 3: Production Readiness (1-2 weeks)**
9. **Identity & Auth** - Login/Register
10. **Audit & Compliance** - Full audit trail
11. **Performance Optimization**
12. **Security Hardening**

---

## 📋 Immediate Next Steps

### **1. Complete Current Work (1-2 days)**

**Commission → Wallet Integration:**
- Create `CommissionAccrualConsumer` in wallet plugin
- Listen to `ACCRUAL_RECORDED` events
- Create ledger transaction
- Credit participant wallet
- Test end-to-end multi-level commissions

**Why do this first:**
- You just built Referral V2 multi-level
- Commission is emitting events
- But wallets aren't being credited!
- **Complete the value chain**

### **2. Build Policy Pillar (1-2 weeks)**

**Core Features:**
- Policy CRUD
- Package selection
- Premium calculation
- Member management
- Benefit entitlements
- Status management

**Why this next:**
- **Foundation for Claims** - Can't process claims without policies
- **Highest business value** - Core insurance product
- **Most complex** - Better to build properly

### **3. Build Payment Pillar (1 week)**

**Core Features:**
- Payment gateway integration
- Premium collection
- Installment plans
- Receipt generation

**Why this next:**
- **Enables revenue** - Collect money from customers
- **Required for Policy** - Can't activate policy without payment
- **Production requirement** - Must have before launch

### **4. Build Claims Pillar (2-3 weeks)**

**Core Features:**
- Submit claim
- Document upload
- Reviewer assignment
- Approval workflow
- Settlement processing

**Why this next:**
- **Revenue impact** - Process claims efficiently
- **Customer satisfaction** - Fast claim processing
- **Depends on Policy** - Validates against policy entitlements

---

## 💡 Summary

### **What's Built:**
✅ Referral V1 + V2 (Multi-level)
✅ Commission (Core)
✅ Wallet/Ledger (Core)
✅ Mission
✅ File
✅ Notification
✅ Survey
✅ User (No Auth)
✅ Permission
✅ Foundation

### **What's Missing:**
❌ Commission-Wallet Integration ← **DO THIS FIRST** (1-2 days)
❌ Policy Pillar ← **THEN THIS** (1-2 weeks)
❌ Payment Pillar ← **THEN THIS** (1 week)
❌ Claims Pillar ← **THEN THIS** (2-3 weeks)
❌ Crowd/Takaful Pillar (Later)
❌ Identity & Auth (Later)

---

## 🎯 My Recommendation

**Start with Commission-Wallet Integration** (1-2 days)
- Completes the referral → commission → wallet flow
- Makes your multi-level referral system actually work
- Users get coins in their wallets!
- Quick win to test entire flow

**Then build Policy Pillar** (1-2 weeks)
- Core insurance functionality
- Highest business value
- Foundation for everything else

**Then Payment Pillar** (1 week)
- Collect money from customers
- Enable premium payments
- Production requirement

**Then Claims Pillar** (2-3 weeks)
- Process insurance claims
- Complete the insurance lifecycle
- Revenue impact

This sequence builds the **complete insurance platform** with referral-driven growth! 🚀
