#!/bin/bash

# ============================================================
# GCPro Test Environment Setup Script
# Seeds database with test users and permissions
# ============================================================

echo "🚀 Setting up GCPro test environment..."
echo ""

# Database connection settings
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USERNAME:-root}"
DB_PASS="${DB_PASSWORD:-Odenza@2026}"
DB_NAME="${DB_DATABASE:-GCPRO}"

echo "📊 Database: $DB_NAME"
echo "🔌 Host: $DB_HOST:$DB_PORT"
echo "👤 User: $DB_USER"
echo ""

# Check if mysql client is installed
if ! command -v mysql &> /dev/null; then
    echo "❌ Error: mysql client not found"
    echo "Please install MySQL client:"
    echo "  macOS: brew install mysql-client"
    echo "  Ubuntu: sudo apt-get install mysql-client"
    exit 1
fi

# Run the seed script
echo "🌱 Seeding test data..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$(dirname "$0")/seed-test-data.sql"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Test environment setup complete!"
    echo ""
    echo "📋 Test Users Created:"
    echo "  Admin User:"
    echo "    ID: 1"
    echo "    Email: admin@gcpro.local"
    echo "    Permissions: missions:*, wallet:*"
    echo ""
    echo "  Test User:"
    echo "    ID: 2"
    echo "    Email: testuser@gcpro.local"
    echo "    Permissions: missions:read, wallet:read"
    echo ""
    echo "💰 System Account:"
    echo "    ID: 1 (for double-entry accounting)"
    echo ""
    echo "🎯 Next Steps:"
    echo "  1. Run: npm start"
    echo "  2. Import Postman collections from postman/ directory"
    echo "  3. Run the Mission-to-Coins Workflow! 🪙"
    echo ""
else
    echo ""
    echo "❌ Error: Failed to seed test data"
    echo "Please check your database connection settings"
    exit 1
fi
