/**
 * Test Login Script
 * Tests if login is working correctly
 * 
 * Usage: node database/test-login.js
 */

import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  dotenv.config({ path: join(__dirname, '../backend/.env') });
} catch (error) {
  console.log('No .env file found, using defaults');
}

async function testLogin() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'campus_placement_db',
      port: process.env.DB_PORT || 3306
    });

    console.log('✅ Connected to database\n');

    // Check if users table exists
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'users'"
    );
    
    if (tables.length === 0) {
      console.log('❌ Users table does not exist!');
      console.log('Please run the schema.sql file first.');
      return;
    }

    // Check if there are any users
    const [users] = await connection.execute('SELECT COUNT(*) as count FROM users');
    console.log(`Found ${users[0].count} users in database\n`);

    if (users[0].count === 0) {
      console.log('❌ No users found in database!');
      console.log('Please run the seed.js script to create test users.');
      return;
    }

    // Test login for each user type
    const testUsers = [
      { email: 'admin@college.edu', password: 'password123', role: 'admin' },
      { email: 'hr@techcorp.com', password: 'password123', role: 'company' },
      { email: 'student1@college.edu', password: 'password123', role: 'student' }
    ];

    console.log('Testing login for test users:\n');

    for (const testUser of testUsers) {
      const [dbUsers] = await connection.execute(
        'SELECT id, email, password_hash, role FROM users WHERE email = ?',
        [testUser.email]
      );

      if (dbUsers.length === 0) {
        console.log(`❌ ${testUser.email}: User not found in database`);
        continue;
      }

      const dbUser = dbUsers[0];
      const isPasswordValid = await bcrypt.compare(testUser.password, dbUser.password_hash);

      if (isPasswordValid) {
        console.log(`✅ ${testUser.email}: Login successful (Role: ${dbUser.role})`);
      } else {
        console.log(`❌ ${testUser.email}: Password mismatch`);
        console.log(`   Expected password: ${testUser.password}`);
        console.log(`   Stored hash: ${dbUser.password_hash.substring(0, 20)}...`);
      }
    }

    console.log('\n✅ Login test complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('   Database access denied. Check your credentials in backend/.env');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('   Database does not exist. Create it first:');
      console.error('   CREATE DATABASE campus_placement_db;');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('   Cannot connect to database. Is MySQL running?');
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testLogin();

