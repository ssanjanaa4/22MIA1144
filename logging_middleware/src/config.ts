import dotenv from 'dotenv';

// Load environment variables from .env when available
dotenv.config();

// Configuration values used by the library
export const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
export const AUTH_USER = process.env.AUTH_USER || '';
export const AUTH_PASS = process.env.AUTH_PASS || '';

export default {
  baseUrl: BASE_URL,
  authUser: AUTH_USER,
  authPass: AUTH_PASS,
};
