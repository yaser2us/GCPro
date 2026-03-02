# GEO Pillar - DDL

> **Owner**: Geo Service
> **Tables**: 1 reference data table for countries and states
> **Source**: Extracted from FULL-DDL.md based on TABLE-OWNERSHIP.md

---

## Table of Contents
1. [geo_state](#geo_state) - Country/state reference

---

## geo_state

Country and state/province reference data.

```sql
CREATE TABLE `geo_state` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `country_code` varchar(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MY',
  `state_code` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_geo_state_cc_sc` (`country_code`,`state_code`),
  KEY `idx_geo_state_status` (`status`),
  KEY `idx_geo_state_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## Relationships

Standalone reference table (no foreign keys).

---

## Key Design Patterns

1. **Reference Data**: Typically seeded at deployment
2. **Composite Key**: `country_code` + `state_code` ensures uniqueness
3. **Status**: Enables deprecation without deletion
4. **Name Indexing**: Supports autocomplete/search

---

## Usage Guidelines

### Typical Data
```sql
-- Malaysia states
INSERT INTO geo_state (country_code, state_code, name, status) VALUES
('MY', 'JHR', 'Johor', 'active'),
('MY', 'KDH', 'Kedah', 'active'),
('MY', 'KTN', 'Kelantan', 'active'),
('MY', 'KUL', 'Kuala Lumpur', 'active'),
('MY', 'MLK', 'Melaka', 'active'),
-- ... etc
```

### Queries
```sql
-- Get all active states for Malaysia
SELECT * FROM geo_state
WHERE country_code = 'MY' AND status = 'active'
ORDER BY name;

-- Validate state code
SELECT 1 FROM geo_state
WHERE country_code = ? AND state_code = ? AND status = 'active';
```

### Integration Points
- `address.state_code` references this table
- Premium rating may vary by state
- Regulatory requirements per jurisdiction
