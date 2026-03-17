#!/usr/bin/env node

/**
 * GCPro Test Environment Setup Script (Node.js)
 * Seeds database with test users and permissions
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || 'Odenza@2026',
  database: process.env.DB_DATABASE || 'GCPRO',
  multipleStatements: true,
};

async function setupTestEnvironment() {
  console.log('🚀 Setting up GCPro test environment...\n');
  console.log(`📊 Database: ${dbConfig.database}`);
  console.log(`🔌 Host: ${dbConfig.host}:${dbConfig.port}`);
  console.log(`👤 User: ${dbConfig.user}\n`);

  let connection;

  try {
    // Connect to database
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected!\n');

    // Read SQL file
    console.log('📖 Reading seed data SQL...');
    const sqlPath = path.join(__dirname, 'seed-test-data.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute SQL
    console.log('🌱 Seeding test data...\n');
    await connection.query(sql);

    console.log('\n✅ Test environment setup complete!\n');
    console.log('📋 Test Users Created:');
    console.log('  Admin User:');
    console.log('    ID: 1');
    console.log('    Email: admin@gcpro.local');
    console.log('    Permissions: missions:*, wallet:*\n');
    console.log('  Test User:');
    console.log('    ID: 2');
    console.log('    Email: testuser@gcpro.local');
    console.log('    Permissions: missions:read, wallet:read\n');
    console.log('💰 System Account:');
    console.log('    ID: 1 (for double-entry accounting)\n');
    console.log('🎯 Next Steps:');
    console.log('  1. Run: npm start');
    console.log('  2. Import Postman collections from postman/ directory');
    console.log('  3. Run the Mission-to-Coins Workflow! 🪙\n');

  } catch (error) {
    console.error('\n❌ Error setting up test environment:');
    console.error(error.message);

    if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('\n💡 Database does not exist. Please create it first:');
      console.error('   CREATE DATABASE GCPRO;');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Cannot connect to MySQL server.');
      console.error('   Make sure MySQL is running on', dbConfig.host + ':' + dbConfig.port);
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 Access denied. Check your credentials:');
      console.error('   DB_USERNAME=' + dbConfig.user);
      console.error('   DB_PASSWORD=***');
    }

    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the setup
setupTestEnvironment().catch(console.error);
