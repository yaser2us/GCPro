@echo off
REM ============================================================
REM GCPro Test Environment Setup Script (Windows)
REM Seeds database with test users and permissions
REM ============================================================

echo.
echo 🚀 Setting up GCPro test environment...
echo.

REM Database connection settings
if "%DB_HOST%"=="" set DB_HOST=localhost
if "%DB_PORT%"=="" set DB_PORT=3306
if "%DB_USERNAME%"=="" set DB_USER=root
if "%DB_PASSWORD%"=="" set DB_PASS=Odenza@2026
if "%DB_DATABASE%"=="" set DB_NAME=GCPRO

echo 📊 Database: %DB_NAME%
echo 🔌 Host: %DB_HOST%:%DB_PORT%
echo 👤 User: %DB_USER%
echo.

REM Run the seed script
echo 🌱 Seeding test data...
mysql -h %DB_HOST% -P %DB_PORT% -u %DB_USER% -p%DB_PASS% %DB_NAME% < "%~dp0seed-test-data.sql"

if %errorlevel% equ 0 (
    echo.
    echo ✅ Test environment setup complete!
    echo.
    echo 📋 Test Users Created:
    echo   Admin User:
    echo     ID: 1
    echo     Email: admin@gcpro.local
    echo     Permissions: missions:*, wallet:*
    echo.
    echo   Test User:
    echo     ID: 2
    echo     Email: testuser@gcpro.local
    echo     Permissions: missions:read, wallet:read
    echo.
    echo 💰 System Account:
    echo     ID: 1 (for double-entry accounting^)
    echo.
    echo 🎯 Next Steps:
    echo   1. Run: npm start
    echo   2. Import Postman collections from postman/ directory
    echo   3. Run the Mission-to-Coins Workflow! 🪙
    echo.
) else (
    echo.
    echo ❌ Error: Failed to seed test data
    echo Please check your database connection settings
    exit /b 1
)
