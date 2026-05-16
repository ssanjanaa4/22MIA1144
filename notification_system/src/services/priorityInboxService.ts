import axios from 'axios';

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
  const response = await axios.get<RemoteNotification[]>(NOTIFICATIONS_URL);
  const notifications = response.data || [];

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
