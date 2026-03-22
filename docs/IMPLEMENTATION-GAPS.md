# Implementation Gaps & Remaining Work

> Last updated: 2026-03-22 (Foundation complete, Quick Wins in progress)
> Based on: `docs/database/FULL-DDL.md` cross-referenced with `src/plugins/`

---

## Status Summary

| Pillar | Coverage | Status |
|--------|----------|--------|
| Claim | 17/17 tables | ✅ Complete |
| Crowd | 10/10 tables | ✅ Complete |
| File | 8/8 tables | ✅ Complete |
| Missions | 7/7 tables | ✅ Complete |
| Notification | 6/6 tables | ✅ Complete |
| Permission | 3/3 tables | ✅ Complete |
| Policy | 13/13 tables | ✅ Complete |
| Survey | 7/7 tables | ✅ Complete |
| Commission | 7/7 tables | ✅ Complete |
| Payment | 7/7 tables | ✅ Complete |
| Referral | 8/8 tables | ✅ Complete |
| Person | 3/3 tables | ✅ Complete (address owned by Foundation) |
| User | 4/8 tables | ⚠️ 50% |
| Wallet | 7/18 tables | 🔴 39% |
| Foundation | 15/15 tables | ✅ Complete |

---

## Option 1 — Quick Wins ✅ DONE

Small structural gaps: entity or repo was missing but the rest of the plugin was complete.

| Plugin | Was Missing | Resolution |
|--------|------------|------------|
| Commission | `commission_payout_item_accrual` repo | ✅ Repo created, module updated |
| Referral | `referral_rule` repo | ✅ Repo created, module updated |
| Payment | `bank_profile` entity + repo | ✅ Entity + repo created, module updated |
| Person | `address` entity + repo | ✅ Resolved by Foundation — `address` table is polymorphic (`owner_type='person'`), no duplicate needed |

---

## ~~Option 2 — Foundation Pillar~~ ✅ DONE

15 shared/support tables built, reviewed, and Postman collection created.
- Spec: `specs/foundation/foundation.pillar.v2.yml`
- Plugin: `src/plugins/foundation/`
- Postman: `postman/foundation-api.postman_collection.json`
- Permissions: `scripts/foundation-permissions.sql`

---

## Option 2 — User Identity Completion (1 day)

Needed for full registration / onboarding flow.

| Table | Purpose |
|-------|---------|
| `device_token` | Push notification device tokens |
| `registration_token` | Email/phone verification tokens |
| `verification_status` | Tracks email/phone/KYC verification state |
| `onboarding_progress` | Step-by-step onboarding tracker |

---

## Option 4 — Wallet Advanced Features (2–3 days) 🔴 Critical

Unlocks deposit, spending rules, holds, batch payouts, and withdrawals.

| Table | Purpose |
|-------|---------|
| `wallet_deposit_intent` | Initiate a deposit into wallet |
| `wallet_spend_intent` | Initiate a spend from wallet |
| `wallet_withdrawal_request` | Request a withdrawal to bank |
| `wallet_hold` | Place a hold on wallet balance |
| `wallet_payout_attempt` | Track payout attempts |
| `wallet_batch` | Group payouts into a batch |
| `wallet_batch_item` | Individual items in a payout batch |
| `wallet_rule_set` | Configurable spending rule sets |
| `wallet_rule` | Individual rules within a rule set |
| `wallet_threshold_rule` | Alert thresholds for wallet balance |
| `wallet_threshold_event` | Triggered threshold alert records |
| `wallet_policy_gate` | Policy-based wallet access controls |

---

## Missing Cross-Pillar Integrations

| Integration | Status | Notes |
|-------------|--------|-------|
| Payment → Policy activation | ❌ Missing | payment_completed event should activate policy |
| Policy → Wallet premium deduction | ❌ Missing | Policy activation should debit wallet |
| Claim → Policy benefit usage | ❌ Missing | Claim settlement should update policy_benefit_usage |
| KYC verified → User verification status | ⚠️ Event emitted | Foundation emits KYC_VERIFIED; user plugin listener not wired |
| Guideline accepted → Onboarding progress | ⚠️ Event emitted | Foundation emits GUIDELINE_ACCEPTED; user plugin listener not wired |

---

## Recommended Build Order

1. ~~**Foundation Pillar**~~ ✅ Done
2. ~~**Quick Wins**~~ ✅ Done
3. **User Identity** ← Next (4 tables, 1 day)
4. **Wallet Advanced** (12 tables, 2–3 days)
5. **Cross-pillar integrations** (Payment→Policy, Policy→Wallet, Claim→Policy)
