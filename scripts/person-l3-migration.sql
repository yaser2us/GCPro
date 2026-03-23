-- L3: Income Level + Media Channel
-- Adds income_level and media_channel columns to person table
-- Safe to run multiple times (IF NOT EXISTS)

ALTER TABLE person
  ADD COLUMN IF NOT EXISTS income_level  VARCHAR(32)  NULL COMMENT 'Self-reported household income band (e.g. <3000, 3000-5000, 5000+)'  AFTER nationality,
  ADD COLUMN IF NOT EXISTS media_channel VARCHAR(64)  NULL COMMENT 'Acquisition/marketing channel (e.g. facebook, agent, organic, referral)' AFTER income_level;
