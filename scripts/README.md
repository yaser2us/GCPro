# Bootstrap Scripts

## Problem: Chicken-Egg Issue

When setting up GCPro for the first time, you face a chicken-egg problem:
- You need `permission:admin` permission to create permissions
- But you can't create that permission without already having it
- All API requests require a valid `X-User-Id` with appropriate permissions

## Solution: Bootstrap Script

The bootstrap script creates the initial admin user with full system permissions, breaking the chicken-egg cycle.

## What It Creates

1. **System Account** (id=1)
2. **Admin Person** (id=1)
3. **Admin User** (id=1)
   - Username: `admin`
   - Password: `Admin@123`
   - Email: `admin@gcpro.local`
4. **22 Core Permissions**
   - Permission management (admin, read, write)
   - Role management (admin, read, write)
   - User management (admin, read, write)
   - Person management (admin, read, write)
   - File management (admin, read, write)
   - Notification management (admin, read, write)
   - Mission management (admin, approve, read, write)
5. **Super Admin Role**
   - Has ALL permissions assigned
6. **User-Role Assignment**
   - Admin user assigned Super Admin role

## How to Run

### Option 1: TypeScript Script (Recommended)

```bash
# Make sure dependencies are installed
npm install

# Run the bootstrap script
npx ts-node scripts/bootstrap-admin.ts
```

### Option 2: Direct SQL

```bash
# Run the SQL script directly
mysql -u root -p gc_pro < scripts/bootstrap-admin.sql

# Note: You'll need to manually generate the password hash
# The SQL script has a placeholder that needs replacing
```

### Option 3: Add npm Script

Add to `package.json`:

```json
{
  "scripts": {
    "bootstrap:admin": "ts-node scripts/bootstrap-admin.ts"
  }
}
```

Then run:

```bash
npm run bootstrap:admin
```

## After Running Bootstrap

1. **Update Postman Collection**
   - Set `user_id` variable to `1`
   - The X-User-Id header is automatically added via pre-request script

2. **Test Permission API**
   - Run the "Complete Workflow" in Permission API collection
   - Should now work without 403 errors

3. **Test Other APIs**
   - Person API
   - User API
   - File API
   - Notification API
   - All should work with X-User-Id: 1

## Default Credentials

⚠️ **IMPORTANT: Change these in production!**

```
Username: admin
Password: Admin@123
User ID: 1
```

## Idempotency

The script is **idempotent** - you can run it multiple times safely:
- Uses `ON DUPLICATE KEY UPDATE` for all inserts
- Won't create duplicates
- Will update existing records to ensure they're active

## Troubleshooting

### Database Connection Error

Make sure your database credentials are correct:

```bash
# Check .env file or set environment variables
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=gc_pro
```

### Permission Denied

The script needs CREATE, INSERT, UPDATE permissions on the database.

### Already Exists Error

If you get unique constraint errors, the bootstrap has already run successfully. You can safely ignore these or re-run (it's idempotent).

## What's Next?

After bootstrapping:

1. **Create Additional Roles**
   - Manager role with limited permissions
   - Agent role for customer-facing operations
   - Viewer role for read-only access

2. **Create Additional Users**
   - Use the User API with your admin credentials
   - Assign appropriate roles to users

3. **Test All P0 Pillars**
   - Permission ✅ (should work now)
   - Person
   - User
   - File
   - Notification

4. **Change Default Password**
   - Update the admin user password via User API
   - Or create a new admin user and deactivate the default one
