import axios from 'axios';
import { BASE_URL } from './config';
import type { LogPayload } from './types';

// Send log payload to evaluation service logs endpoint using provided token.
export async function sendLog(token: string, payload: LogPayload) {
  const url = `${BASE_URL}/evaluation-service/logs`;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const resp = await axios.post(url, payload, { headers });
  return resp.data;
}

export default { sendLog };
