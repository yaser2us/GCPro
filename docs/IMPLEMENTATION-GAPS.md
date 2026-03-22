# Implementation Gaps & Remaining Work

> Last updated: 2026-03-23 (Foundation ✅, Quick Wins ✅, User Identity ✅, Wallet Advanced ✅, Cross-Pillar Integrations ✅)
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
| User | 4/4 tables | ✅ Complete (device_token, registration_token, verification_status, onboarding_progress → user-identity plugin) |
| Wallet | 7/7 tables | ✅ Complete (core) |
| Wallet Advanced | 12/12 tables | ✅ Complete |
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

## ~~Option 2 — User Identity Completion~~ ✅ DONE

4 tables built as a new `user-identity` plugin, reviewed, Postman collection created.
- Spec: `specs/user-identity/user-identity.pillar.v2.yml`
- Plugin: `src/plugins/user-identity/`
- Postman: `postman/user-identity-api.postman_collection.json`
- Permissions: `scripts/user-identity-permissions.sql`

---

## ~~Option 4 — Wallet Advanced Features~~ ✅ DONE

12 tables built as a new `wallet-advanced` plugin.
- Spec: `specs/wallet-advanced/wallet-advanced.pillar.v2.yml`
- Plugin: `src/plugins/wallet-advanced/`

---

## ~~Missing Cross-Pillar Integrations~~ ✅ ALL DONE

| Integration | Status | Implementation |
|-------------|--------|----------------|
| Payment → Policy activation | ✅ Done | `PAYMENT_SUCCEEDED` → `PolicyPaymentSucceededConsumer` → activates policy |
| Policy → Wallet premium deduction | ✅ Done | `POLICY_ACTIVATED` → `PolicyActivatedConsumer` → creates `WalletSpendIntent` |
| Claim → Policy benefit usage | ✅ Done | `CLAIM_SETTLED` → `ClaimSettledConsumer` → upserts `policy_benefit_usage` |
| KYC verified → User verification status | ✅ Done | `KYC_VERIFIED` → `KycVerifiedConsumer` → upserts `verification_status` |
| Guideline accepted → Onboarding progress | ✅ Done | `GUIDELINE_ACCEPTED` → `GuidelineAcceptedConsumer` → upserts `onboarding_progress` |

---

## Recommended Build Order

1. ~~**Foundation Pillar**~~ ✅ Done
2. ~~**Quick Wins**~~ ✅ Done
3. ~~**User Identity**~~ ✅ Done
4. ~~**Wallet Advanced**~~ ✅ Done
5. ~~**Cross-pillar integrations**~~ ✅ Done
