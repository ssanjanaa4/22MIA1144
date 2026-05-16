import axios from 'axios';
import { BASE_URL, AUTH_USER, AUTH_PASS } from './config';

// Simple in-memory token cache
let cachedToken: string | null = null;
let tokenExpiry: number | null = null; // epoch ms

// Fetch a new token from /evaluation-service/auth using configured credentials.
async function fetchToken(): Promise<string> {
  const url = `${BASE_URL}/evaluation-service/auth`;
  const resp = await axios.post(url, { username: AUTH_USER, password: AUTH_PASS });
  // Try common fields for token response
  const token = resp.data?.token ?? resp.data?.access_token ?? resp.data;
  if (!token) throw new Error('Auth endpoint did not return a token');

  // Set expiry to now + 55 minutes by default to avoid immediate expiry.
  const expiry = Date.now() + 55 * 60 * 1000;

  cachedToken = token;
  tokenExpiry = expiry;
  return token;
}

// Public: get token, using cache when valid
export async function getToken(): Promise<string> {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) return cachedToken;
  return fetchToken();
}

// Exported for tests or clearing
export function clearToken() {
  cachedToken = null;
  tokenExpiry = null;
}

export default { getToken, clearToken };
