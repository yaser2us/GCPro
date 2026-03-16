# 🚀 GCPro Bootstrap Guide

## The Chicken-Egg Problem You're Facing

```
You: "Let me create a permission via API"
API: "403 Forbidden - You need permission:admin"
You: "But I'm trying to CREATE the permission:admin permission!"
API: "Sorry, you need permission:admin to do that"
You: "..."
```

## The Solution

Run the bootstrap script to create an initial admin user with full permissions.

## Quick Start (3 Steps)

### Step 1: Run Bootstrap Script

```bash
npm run bootstrap:admin
```

This creates:
- Admin user (id=1, username=admin, password=Admin@123)
- All 22 core permissions
- Super Admin role with all permissions
- Assigns the role to admin user

### Step 2: Verify Bootstrap Succeeded

You should see this output:

```
═══════════════════════════════════════════════════════════
🎉 Bootstrap completed successfully!

📋 Summary:
   - Admin User ID: 1
   - Username: admin
   - Password: Admin@123
   - Email: admin@gcpro.local
   - Role: Super Administrator
   - Permissions: 22 (all system permissions)

💡 Next Steps:
   1. Update your Postman collection variable: user_id = 1
   2. Test the Permission API endpoints
   3. Create additional users and roles as needed
═══════════════════════════════════════════════════════════
```

### Step 3: Test Permission API

Open Postman and test the Permission API:
- The `user_id` variable is already set to `1`
- The `X-User-Id` header is automatically added
- Run the "Complete Workflow" folder
- All requests should now succeed ✅

## What Was Created

### Core Permissions (22 total)

| Resource | Permissions |
|----------|-------------|
| Permission | admin, read, write |
| Role | admin, read, write |
| User | admin, read, write |
| Person | admin, read, write |
| File | admin, read, write |
| Notification | admin, read, write |
| Mission | admin, approve, read, write |

### Admin User Details

```
User ID:    1
Username:   admin
Password:   Admin@123  ⚠️ CHANGE THIS IN PRODUCTION
Email:      admin@gcpro.local
Status:     active
Role:       Super Administrator (has ALL permissions)
```

### Database Records Created

```sql
-- 1 Account (system account)
INSERT INTO account (id=1, type='system')

-- 1 Person (admin person)
INSERT INTO person (id=1, first_name='System', last_name='Administrator')

-- 1 User (admin user)
INSERT INTO user (id=1, username='admin')

-- 1 Credential (password: Admin@123)
INSERT INTO user_credential (user_id=1, type='password')

-- 22 Permissions
INSERT INTO permission (code='permission:admin', ...) -- x22

-- 1 Role
INSERT INTO role (code='super_admin')

-- 22 Role-Permission mappings
INSERT INTO role_permission (role_id=super_admin, permission_id=...) -- x22

-- 1 User-Role mapping
INSERT INTO user_role (user_id=1, role_id=super_admin)
```

## Troubleshooting

### "Database connection failed"

Check your `.env` file:
```bash
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=gcpro
```

### "Table doesn't exist"

Make sure your database schema is created. If using TypeORM sync:
```bash
# In .env
DB_SYNC=true  # Creates tables automatically in development

# Or run migrations if you have them
npm run migration:run
```

### "Duplicate entry" errors

The script has already run successfully! These errors are harmless - the script is idempotent.

### Still getting 403 errors

1. Make sure bootstrap completed successfully
2. Verify user_id is set to 1 in Postman collection variables
3. Check that X-User-Id header is being added (should be automatic via pre-request script)
4. Restart your NestJS application to reload permissions

## Testing Order

Now that you have an admin user, test in this order:

1. ✅ **Permission API** - Should work now!
2. ✅ **Person API** - Create persons
3. ✅ **User API** - Create users and assign roles
4. ✅ **File API** - Upload and manage files
5. ✅ **Notification API** - Send notifications

## Creating Additional Users

Once bootstrap is complete, use the User API to create more users:

```bash
# 1. Create Person
POST /v1/persons
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com"
}

# 2. Create User
POST /v1/users
{
  "person_id": "{{person_id}}",
  "username": "johndoe",
  "email": "john@example.com"
}

# 3. Create Password Credential
POST /v1/users/{{user_id}}/credentials
{
  "type": "password",
  "secret": "SecurePassword123"
}

# 4. Assign Role
POST /v1/users/{{user_id}}/roles
{
  "role_id": "{{role_id}}"
}
```

## Security Notes

⚠️ **IMPORTANT FOR PRODUCTION:**

1. **Change the default password immediately**
   ```bash
   # Use User API to update password
   PUT /v1/users/1/credentials/{{credential_id}}
   {
     "secret": "YourNewSecurePassword"
   }
   ```

2. **Create a real admin user and deactivate the default one**
   ```bash
   # After creating your admin user
   POST /v1/users/1/deactivate
   ```

3. **Use environment variables for sensitive data**
   - Never commit .env to git
   - Use secrets management in production
   - Rotate passwords regularly

4. **Implement proper authentication**
   - This bootstrap is for initial setup only
   - Add JWT/OAuth for production
   - Implement password policies

## What's Next?

After successful bootstrap:

- [ ] Test all P0 pillar APIs with user_id=1
- [ ] Create additional roles (manager, agent, viewer)
- [ ] Create additional users
- [ ] Set up proper authentication (JWT/OAuth)
- [ ] Change default admin password
- [ ] Build out your application features

## Need Help?

If you're still stuck:
1. Check the bootstrap script output for errors
2. Verify database connection
3. Check application logs
4. Review the scripts/README.md for detailed troubleshooting

---

**You're all set!** The chicken-egg problem is solved. Time to build! 🎉
