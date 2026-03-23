-- M10: Streak / Milestone Mission Definitions
-- Safe to run multiple times (ON DUPLICATE KEY UPDATE)

INSERT INTO mission_definition
  (code, name, description, scope, cadence, trigger_type, criteria_json, reward_json, status, max_per_user)
VALUES
  (
    'streak_login_7day',
    '7-Day Login Streak',
    'Log in for 7 consecutive days to earn Mission Coins.',
    'global',
    'daily',
    'event',
    '{"metric": "login", "target": 7}',
    '{"type": "coins", "amount": 100}',
    'active',
    999
  ),
  (
    'milestone_first_carer',
    'Add Your First Carer',
    'Add a carer to your policy to earn Mission Coins.',
    'global',
    'one_time',
    'event',
    '{"metric": "carers_added", "target": 1}',
    '{"type": "coins", "amount": 50}',
    'active',
    1
  )
ON DUPLICATE KEY UPDATE
  name             = VALUES(name),
  description      = VALUES(description),
  criteria_json    = VALUES(criteria_json),
  reward_json      = VALUES(reward_json),
  status           = VALUES(status),
  updated_at       = NOW();
