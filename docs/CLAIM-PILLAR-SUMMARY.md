# Claims Pillar - YML Specification Summary

**Generated:** 2026-03-21
**Spec File:** `specs/claim/claim.pillar.v2.yml`
**Status:** ✅ YML specification ready for code generation

---

## 📊 Pillar Overview

### **Claims Pillar Stats**
- **Total Tables:** 17
- **Aggregate Roots:** 4 (ClaimCase, GuaranteeLetter, MedicalCase, MedicalUnderwritingCase)
- **Commands:** 10
- **Domain Events:** 14
- **Integrations:** Policy (benefit validation), File (documents), Wallet (settlement)

---

## 📋 Tables (17 Total)

### **Core Claim Tables (8)**
1. **claim_case** - Main claim aggregate with lifecycle management
2. **claim_case_number_sequence** - Sequence generator for claim numbers
3. **claim_document** - Supporting documents (medical bills, receipts, reports)
4. **claim_event** - Immutable audit trail of claim activities
5. **claim_fraud_signal** - Fraud detection signals and risk indicators
6. **claim_link** - Relationships between claims (duplicates, related)
7. **claim_review** - Reviewer decisions and assessments
8. **claim_settlement_flag** - Settlement eligibility per crowdfunding period

### **Medical Case Tables (4)**
9. **medical_case** - Hospital admission cases for tracking
10. **medical_case_event** - Medical case event log
11. **medical_provider** - Panel hospitals and clinics
12. **guarantee_letter** - Guarantee letters for cashless hospitalization

### **Medical Underwriting Tables (5)**
13. **medical_underwriting_case** - Pre-existing conditions assessment
14. **medical_underwriting_outcome** - Versioned underwriting decisions
15. **medical_underwriting_term** - Terms, exclusions, loadings
16. **medical_underwriting_current_outcome** - Current active outcome
17. **medical_underwriting_evidence** - Evidence (surveys, reports, tests)

---

## 🎯 Commands (10 Workflows)

### **1. Claim.Submit**
**Path:** `POST /api/v1/claim/submit`

**What it does:**
- Creates new claim case
- Generates unique claim number (year + sequence)
- Validates policy is active
- Checks benefit entitlements
- Attaches supporting documents
- Runs fraud detection checks
- Detects duplicate claims

**Guards:**
- Account must be active
- Claimant and insurant persons must exist
- Policy must be active
- Policy must have active benefit entitlements
- No duplicate claim for same person + date + hospital

**Event:** `CLAIM_SUBMITTED`

---

### **2. Claim.AssignReviewer**
**Path:** `POST /api/v1/claim/:claimId/assign-reviewer`

**What it does:**
- Assigns reviewer to claim
- Updates claim status to "under_review"
- Records review assignment

**Guards:**
- Claim must be in "submitted" or "under_review" status
- Reviewer must exist and be active

**Event:** `CLAIM_REVIEWER_ASSIGNED`

---

### **3. Claim.AddDocument**
**Path:** `POST /api/v1/claim/:claimId/documents/add`

**What it does:**
- Uploads supporting document to claim
- Links file_upload to claim
- Records document type

**Guards:**
- Claim must exist and not be cancelled
- File upload must exist

**Event:** `CLAIM_DOCUMENT_ADDED`

---

### **4. Claim.RecordFraudSignal**
**Path:** `POST /api/v1/claim/:claimId/fraud-signal/record`

**What it does:**
- Records fraud detection signal
- Assigns risk score (0-100)
- Stores signal payload with evidence
- Emits event if score >= 75

**Guards:**
- Claim must exist

**Event:** `CLAIM_FRAUD_SIGNAL_RECORDED` (if score >= 75)

---

### **5. Claim.Approve**
**Path:** `POST /api/v1/claim/:claimId/approve`

**What it does:**
- Approves claim for settlement
- Sets approved amount
- Validates against benefit limits
- Records reviewer decision

**Guards:**
- Claim must be "under_review"
- Approved amount <= requested amount
- Approved amount within benefit entitlement limits

**Event:** `CLAIM_APPROVED`

---

### **6. Claim.Reject**
**Path:** `POST /api/v1/claim/:claimId/reject`

**What it does:**
- Rejects claim with reason
- Records reviewer decision
- Updates claim status

**Guards:**
- Claim must be "under_review"

**Event:** `CLAIM_REJECTED`

---

### **7. Claim.Settle**
**Path:** `POST /api/v1/claim/:claimId/settle`

**What it does:**
- Processes claim settlement
- Creates settlement flag for crowdfunding period
- Confirms benefit usage on policy
- Triggers payout (via event consumer)

**Guards:**
- Claim must be "approved"
- Settlement amount must match approved amount

**Integration:**
- Calls `Policy.BenefitUsage.Confirm` to update policy_benefit_usage

**Event:** `CLAIM_SETTLED`

---

### **8. GuaranteeLetter.Issue**
**Path:** `POST /api/v1/guarantee-letter/issue`

**What it does:**
- Issues guarantee letter for cashless hospitalization
- Generates unique GL number
- Reserves benefit usage from policy
- Sets validity period

**Guards:**
- Medical case must exist and be "reported" or "admitted"
- Policy must be active
- Approved limit must be within policy entitlements

**Integration:**
- Calls `Policy.BenefitUsage.Reserve` to pre-authorize coverage

**Event:** `GUARANTEE_LETTER_ISSUED`

---

### **9. MedicalCase.Update**
**Path:** `POST /api/v1/medical-case/:medicalCaseId/update`

**What it does:**
- Updates medical case status
- Records discharge date
- Logs medical case event

**Guards:**
- Medical case must exist

**Event:** `MEDICAL_CASE_UPDATED`

---

### **10. Underwriting.RecordDecision**
**Path:** `POST /api/v1/underwriting/:caseId/record-decision`

**What it does:**
- Records medical underwriting decision
- Creates versioned outcome
- Defines terms (exclusions, loadings, waiting periods)
- Updates current outcome pointer

**Guards:**
- Case must be "open" or "pending"

**Decisions:**
- `accept` - Approve without conditions
- `reject` - Decline coverage
- `accept_with_terms` - Approve with exclusions/loadings
- `postpone` - Defer decision pending more info

**Event:** `UNDERWRITING_DECISION_RECORDED`

---

## 📊 Claim Lifecycle

```
draft
  ↓ (Claim.Submit)
submitted ──────────────→ CLAIM_SUBMITTED event
  ↓ (Claim.AssignReviewer)
under_review ────────────→ CLAIM_REVIEWER_ASSIGNED event
  ↓ (Claim.Approve or Claim.Reject)
approved / rejected ─────→ CLAIM_APPROVED / CLAIM_REJECTED event
  ↓ (Claim.Settle)
settled ─────────────────→ CLAIM_SETTLED event
```

**Alternative Paths:**
- `under_review → pending_info` (info requested)
- `pending_info → under_review` (info provided)
- `* → cancelled` (cancellation)

---

## 🔗 Integration Points

### **With Policy Pillar**

**Synchronous Reads:**
- Validate policy is active
- Check policy_benefit_entitlement for claim limits

**Command Calls:**
1. `Policy.BenefitUsage.Reserve` (when issuing GL)
   - Reserves benefit amount for hospitalization
   - Prevents exceeding annual limits

2. `Policy.BenefitUsage.Confirm` (when settling claim)
   - Confirms benefit usage
   - Updates policy_benefit_usage.used_amount
   - Decreases available balance

**Event Consumers (in Wallet pillar):**
- `CLAIM_SETTLED` → Creates wallet transaction for payout

### **With File Pillar**
- claim_document.file_upload_id → file_upload.id
- Stores medical bills, receipts, reports, lab results

### **With Notification Pillar**
- Consumes all claim events to send notifications
- Alerts on: submission, review, approval, rejection, settlement

---

## 🎪 Fraud Detection

### **Fraud Signals Tracked:**
1. **duplicate_admission** - Same person, same date, same hospital
2. **high_frequency** - Too many claims in short period
3. **suspicious_pattern** - Unusual claim patterns
4. **amount_outlier** - Claim amount significantly higher than average
5. **rapid_repeat** - Repeat claim for same condition too soon

### **Risk Scoring:**
- Score: 0-100
- 0-24: Low risk
- 25-49: Medium risk
- 50-74: High risk
- 75-100: Critical risk (emits event)

---

## 📋 Claim Number Format

**Format:** `CL-YYYY-NNNNN`

**Example:** `CL-2024-00123`

**Components:**
- Prefix: `CL`
- Year: 4 digits
- Sequence: 5 digits (auto-increment per year)

**Generation:**
- Uses `claim_case_number_sequence` table
- Atomic increment with row locking
- Resets annually (new year = sequence starts at 1)

---

## 🏥 Guarantee Letter (GL)

### **What is a GL?**
A guarantee letter is issued to panel hospitals for **cashless hospitalization**. The hospital bills the insurer directly instead of the patient paying upfront.

### **GL Workflow:**
1. Member admitted to hospital
2. Hospital contacts insurer
3. Insurer issues GL with approved limit
4. Hospital provides treatment up to GL limit
5. Hospital submits claim to insurer
6. Insurer settles with hospital directly

### **GL Number Format:** `GL-YYYYMMDD-NNNN`

**Example:** `GL-20240401-0042`

---

## 🧬 Medical Underwriting

### **When is it used?**
- Pre-existing conditions
- High-risk applicants
- Policy renewals with claims history
- Special coverage requests

### **Outcome Versioning:**
- Version 1: Initial assessment
- Version 2: Appeal result
- Version 3: Reassessment after new evidence

### **Term Types:**
1. **exclusion** - Specific condition not covered
2. **loading** - Premium increase (e.g., +50%)
3. **waiting_period** - Days before coverage starts
4. **condition** - Special terms (e.g., "subject to annual review")

---

## 🔐 Idempotency Strategy

### **Duplicate Detection:**
```sql
-- Prevents duplicate claims
UNIQUE(insurant_person_id, admission_date, hospital_name)

-- Example:
-- Person 1000 + 2024-04-01 + Hospital A = Already exists
-- Duplicate submission detected
```

### **Claim Number Uniqueness:**
```sql
UNIQUE(claim_number)  -- CL-2024-00123 can only exist once
UNIQUE(claim_year, claim_seq)  -- 2024 + 123 = unique
```

---

## 🎯 Next Steps

### **1. Generate Code from YML** (Use existing tools)
```bash
# Generate 17 entities
# Generate 17 repositories
# Generate 10 DTOs
# Generate 1 workflow service
# Generate 2 controllers (ClaimController + GuaranteeLetterController)
# Generate 1 module
```

### **2. Create Postman Collection**
- 10 command requests
- E2E workflow tests
- Outbox verification queries

### **3. Integration Testing**
1. Submit claim → Verify policy validation
2. Issue GL → Verify benefit reservation
3. Settle claim → Verify benefit confirmation
4. Check outbox → Verify all events

### **4. Build Consumers**
- ClaimSettledConsumer (in Wallet pillar) → Creates payout transaction
- ClaimNotificationConsumer (in Notification pillar) → Sends alerts

---

## 📊 Comparison: Policy vs Claims

| Metric | Policy Pillar | Claims Pillar |
|--------|---------------|---------------|
| Tables | 13 | 17 |
| Commands | 11 | 10 |
| Events | 10 | 14 |
| Aggregates | 1 | 4 |
| Complexity | Medium | High |

**Why Claims is more complex:**
- Multiple aggregates (Claim, GL, MedicalCase, Underwriting)
- Fraud detection logic
- Medical underwriting versioning
- Integration with Policy for benefit validation
- Settlement coordination with crowdfunding periods

---

## ✅ Spec Completeness Checklist

✅ All 17 tables defined with complete DDL
✅ All FK relationships documented
✅ 10 commands with Guard → Write → Emit pattern
✅ 14 domain events defined
✅ Outbox pattern integrated
✅ Policy pillar integration defined
✅ Idempotency strategy documented
✅ Fraud detection workflow included
✅ Medical underwriting workflow included
✅ Guarantee letter issuance workflow included
✅ Claim lifecycle states mapped
✅ Error codes defined
✅ DTOs specified

**Status:** 🎉 **READY FOR CODE GENERATION**

---

## 🚀 Recommended Build Order

### **Phase 1: Core Claim Flow** (Week 1)
1. claim_case entity + repository
2. Claim.Submit command
3. Claim.Approve command
4. Claim.Reject command
5. Claim.Settle command
6. Basic Postman tests

### **Phase 2: Documents & Fraud** (Week 1)
7. claim_document entity + repository
8. claim_fraud_signal entity + repository
9. Claim.AddDocument command
10. Claim.RecordFraudSignal command
11. Fraud detection service

### **Phase 3: Medical Cases & GL** (Week 2)
12. medical_case entity + repository
13. guarantee_letter entity + repository
14. GuaranteeLetter.Issue command
15. MedicalCase.Update command
16. GL Postman tests

### **Phase 4: Underwriting** (Week 2)
17. medical_underwriting_* entities (5 tables)
18. Underwriting.RecordDecision command
19. Versioning logic
20. Terms management

### **Phase 5: Integration & Testing** (Week 3)
21. Policy benefit validation
22. Wallet settlement consumer
23. Notification consumers
24. E2E testing
25. Performance optimization

**Total Estimated Time:** 2-3 weeks

---

## 📖 Related Documents

- **YML Spec:** `specs/claim/claim.pillar.v2.yml`
- **DDL Reference:** `docs/database/FULL-DDL.md` (claim tables)
- **Policy Integration:** `specs/policy/policy.pillar.v2.yml`
- **Roadmap:** `docs/PILLARS-ROADMAP.md`

---

**Next Command:** Start building the Claims pillar code!

```bash
# Follow the same pattern as Policy pillar:
# 1. Generate entities from YML
# 2. Generate repositories
# 3. Generate workflow service
# 4. Generate controllers
# 5. Generate Postman collection
# 6. Test E2E workflow
```
