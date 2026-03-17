# GCPro Setup Scripts

Scripts for setting up test environment and seeding data.

---

## Quick Setup

### macOS/Linux

```bash
cd scripts
./setup-test-env.sh
```

### Windows

```batch
cd scripts
setup-test-env.bat
```

---

## What Gets Created

### Test Users

**Admin User (ID: 1)**
- Email: `admin@gcpro.local`
- Username: `admin`
- Permissions:
  - `missions:admin` - Full mission management
  - `missions:manage` - Manage missions
  - `missions:review` - Review submissions
  - `missions:read` - Read mission data
  - `wallet:admin` - Full wallet management
  - `wallet:manage` - Manage wallets
  - `wallet:read` - Read wallet data

**Test User (ID: 2)**
- Email: `testuser@gcpro.local`
- Username: `testuser`
- Permissions:
  - `missions:read` - Read mission data
  - `wallet:read` - Read wallet data

### System Accounts

**System Account (ID: 1)**
- Type: `system`
- Used for double-entry accounting
- Debited when users receive coins
- Credited when users spend coins

### Person Records

Links users to the person table:
- Person ID 1 → User ID 1 (Admin)
- Person ID 2 → User ID 2 (Test User)

---

## Database Connection

### Default Settings

The scripts use these defaults:
```
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=Odenza@2026
DB_DATABASE=GCPRO
```

### Custom Settings

**macOS/Linux:**
```bash
export DB_HOST=your-host
export DB_PORT=3307
export DB_USERNAME=your-user
export DB_PASSWORD=your-password
export DB_DATABASE=your-database

./setup-test-env.sh
```

**Windows:**
```batch
set DB_HOST=your-host
set DB_PORT=3307
set DB_USERNAME=your-user
set DB_PASSWORD=your-password
set DB_DATABASE=your-database

setup-test-env.bat
```

---

## Manual Setup

If you prefer to run the SQL manually:

```bash
mysql -u root -p GCPRO < seed-test-data.sql
```

Or import via MySQL Workbench:
1. Open MySQL Workbench
2. Connect to your database
3. File → Run SQL Script
4. Select `seed-test-data.sql`
5. Click "Run"

---

## Verification

After running the setup, verify in database:

```sql
-- Check users
SELECT id, username, email FROM user WHERE id IN (1, 2);

-- Check admin permissions
SELECT u.username, p.code
FROM user u
JOIN user_permission up ON u.id = up.user_id
JOIN permission p ON up.permission_id = p.id
WHERE u.id = 1;

-- Check system account
SELECT id, type, status FROM account WHERE id = 1;
```

---

## Troubleshooting

### mysql command not found

**macOS:**
```bash
brew install mysql-client
echo 'export PATH="/opt/homebrew/opt/mysql-client/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

**Ubuntu/Debian:**
```bash
sudo apt-get install mysql-client
```

**Windows:**
- Install MySQL from https://dev.mysql.com/downloads/installer/
- Add MySQL bin directory to PATH

### Access denied

Check your database credentials:
```bash
mysql -u root -p
# Enter password when prompted
```

If successful, update the script variables with your credentials.

### Table doesn't exist

Run the main DDL first:
```bash
mysql -u root -p GCPRO < docs/database/FULL-DDL.md
```

---

## After Setup

### Test the API

1. **Start the server:**
   ```bash
   npm start
   ```

2. **Import Postman collections:**
   - `postman/wallet-api.postman_collection.json`
   - `postman/mission-to-coins-workflow.postman_collection.json`

3. **Run the Mission-to-Coins Workflow:**
   - Open Postman
   - Select "Mission-to-Coins Workflow" collection
   - Click "Run"
   - Watch the coins appear! 🪙

### Test Users in Postman

The Postman collections already use these user IDs:
- `admin_user_id = 1` (Admin with full permissions)
- `test_user_id = 2` (Regular user with read permissions)

No changes needed!

---

## Files

- `seed-test-data.sql` - SQL script with all test data
- `setup-test-env.sh` - Setup script for macOS/Linux
- `setup-test-env.bat` - Setup script for Windows
- `README.md` - This file

---

## What If I Already Have Data?

The scripts use `ON DUPLICATE KEY UPDATE`, so:
- Existing users will be updated
- Existing permissions will be preserved
- New permissions will be added
- Safe to run multiple times

---

## Cleanup

To remove test data:

```sql
-- Remove test users
DELETE FROM user WHERE id IN (1, 2);

-- Remove test persons (cascades via foreign keys)
DELETE FROM person WHERE id IN (1, 2);

-- Remove system account (be careful!)
DELETE FROM account WHERE id = 1 AND type = 'system';
```

**Warning:** This will delete all data associated with these users (missions, wallets, etc.)!

---

## Next Steps

After setup:
1. ✅ Test users created
2. ✅ Permissions assigned
3. ✅ System account ready
4. 🚀 Run `npm start`
5. 📮 Test with Postman collections
6. 🎉 See coins in wallet!
