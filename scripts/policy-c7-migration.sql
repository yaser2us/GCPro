-- C7: Split Payment 50/50
-- Extends policy_billing_plan.billing_type to include 'split' and 'full' values
-- Safe to run multiple times (MODIFY COLUMN is idempotent for type changes)

ALTER TABLE policy_billing_plan
  MODIFY COLUMN billing_type VARCHAR(20) NOT NULL
    COMMENT 'Billing schedule type: annual | monthly | quarterly | split (50/50) | full (upfront)';
