// Ensure dotenv is loaded before reading env vars
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mysql = require('mysql2/promise');

// In Vercel, the string "true" comes from process.env as a string
const useSSL = process.env.DB_SSL === 'true' || process.env.DB_SSL === true;

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sixhill_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: useSSL ? { rejectUnauthorized: false } : undefined
});

module.exports = pool;