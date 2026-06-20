/**
 * Database Configuration
 * Handles MySQL connection using mysql2 with connection pooling
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Create connection pool for better performance
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'campus_placement_db',
  port: process.env.DB_PORT || 3306,
  ssl: { rejectUnauthorized: true },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

/**
 * Test database connection
 */
export const createConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Database connected successfully');
    connection.release();
    return pool;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
};

/**
 * Execute a query with error handling
 * @param {string} query - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise} Query result
 */
export const query = async (query, params = []) => {
  try {
    const [results] = await pool.execute(query, params);
    return results;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

/**
 * Begin a transaction
 * @returns {Promise} Transaction connection
 */
export const beginTransaction = async () => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  return connection;
};

/**
 * Commit a transaction
 * @param {Object} connection - Transaction connection
 */
export const commitTransaction = async (connection) => {
  await connection.commit();
  connection.release();
};

/**
 * Rollback a transaction
 * @param {Object} connection - Transaction connection
 */
export const rollbackTransaction = async (connection) => {
  await connection.rollback();
  connection.release();
};

export default pool;

