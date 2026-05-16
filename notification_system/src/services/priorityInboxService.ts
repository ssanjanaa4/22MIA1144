import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables from .env when available
dotenv.config();

// Notification shape returned from the remote API.
// The API may return more fields, but we only care about these for sorting.
export type RemoteNotification = {
  id: string;
  type: 'Placement' | 'Result' | 'Event' | string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
};

// Local shape for sorted results.
export type PriorityNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  score: number;
};

const NOTIFICATIONS_URL = 'http://4.224.186.213/evaluation-service/notifications';

// Get the API key from environment (required to authenticate requests to the notifications endpoint).
const NOTIFICATIONS_API_KEY = process.env.NOTIFICATIONS_API_KEY || '';

function assertNotificationConfig() {
  if (!NOTIFICATIONS_API_KEY) {
    const error: any = new Error('Missing NOTIFICATIONS_API_KEY in notification_system/.env');
    error.status = 500;
    throw error;
  }

  assertTokenNotExpired(NOTIFICATIONS_API_KEY, 'NOTIFICATIONS_API_KEY');
}

function assertTokenNotExpired(token: string, name: string) {
  const [, payload] = token.split('.');
  if (!payload) return;

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    const exp = decoded.exp ?? decoded.MapClaims?.exp;
    if (exp && Date.now() >= Number(exp) * 1000) {
      const expiredAt = new Date(Number(exp) * 1000).toISOString();
      const error: any = new Error(`${name} expired at ${expiredAt}; generate a fresh token`);
      error.status = 500;
      throw error;
    }
  } catch (error: any) {
    if (error.status) throw error;
  }
}

function toServiceError(error: unknown) {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 502;
    const message =
      status === 401 || status === 403
        ? 'Evaluation service rejected NOTIFICATIONS_API_KEY'
        : `Evaluation service request failed with status ${status}`;

    const serviceError: any = new Error(message);
    serviceError.status = status === 401 || status === 403 ? 502 : status;
    serviceError.detail = error.response?.data;
    return serviceError;
  }

  return error;
}

function normalizeNotification(raw: any): RemoteNotification {
  const type = raw.type ?? raw.Type ?? 'Event';
  const message = raw.body ?? raw.message ?? raw.Message ?? '';

  return {
    id: raw.id ?? raw.ID,
    type,
    title: raw.title ?? type,
    body: message,
    createdAt: raw.createdAt ?? raw.Timestamp ?? raw.timestamp,
    read: raw.read ?? raw.Read ?? false,
  };
}

// Assign a simple priority score based on notification type and recency.
function calculatePriority(notification: RemoteNotification): number {
  // Base priority per type: Placement > Result > Event
  const typeScore =
    notification.type === 'Placement' ? 1000 :
    notification.type === 'Result' ? 500 :
    notification.type === 'Event' ? 100 :
    0;

  // More recent notifications should score slightly higher.
  const timestamp = new Date(notification.createdAt).getTime();
  const timeScore = isNaN(timestamp) ? 0 : timestamp / 1000;

  return typeScore + timeScore;
}

// Fetch notifications from the external service and return the top 10 unread.
export async function getTopUnreadNotifications(): Promise<PriorityNotification[]> {
  assertNotificationConfig();

  // Build headers with Authorization if API key is provided.
  const headers = NOTIFICATIONS_API_KEY ? { Authorization: `Bearer ${NOTIFICATIONS_API_KEY}` } : {};
  let response;
  try {
    response = await axios.get<any>(NOTIFICATIONS_URL, { headers });
  } catch (error) {
    throw toServiceError(error);
  }
  const rawNotifications: any[] = Array.isArray(response.data)
    ? response.data
    : response.data?.notifications ?? response.data?.items ?? [];
  const notifications = rawNotifications.map(normalizeNotification);

  // Filter only unread notifications.
  const unread = notifications.filter((notification) => !notification.read);

  // Map to include a priority score, then sort highest first.
  const scored = unread.map((notification) => ({
    ...notification,
    score: calculatePriority(notification),
  }));

  const sorted = scored.sort((a, b) => {
    // Sort by score descending.
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    // Fallback by recency if scores are equal.
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Return the top 10 notifications only.
  return sorted.slice(0, 10);
}
