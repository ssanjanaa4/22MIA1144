import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables from .env when available
dotenv.config();

/**
 * Basic types used by the scheduler. Real APIs may differ, so this
 * code includes small normalization steps to be more forgiving.
 */
export type Task = {
  id: string | number;
  duration: number; // in hours (number)
  impact: number; // numeric impact/score
  meta?: any; // original task payload for reference
};

export type Depot = { id: string | number; mechanicHours: number };

export type Vehicle = { id: string | number; depotId?: string | number; tasks?: any[] };

// Remote endpoints (kept here for easy change)
const DEPOTS_URL = 'http://4.224.186.213/evaluation-service/depots';
const VEHICLES_URL = 'http://4.224.186.213/evaluation-service/vehicles';

// Get API key from environment for authentication (required by the external API)
const SCHEDULER_API_KEY = process.env.SCHEDULER_API_KEY || '';

function assertSchedulerConfig() {
  if (!SCHEDULER_API_KEY || SCHEDULER_API_KEY === 'your-api-key-here') {
    const error: any = new Error('Missing SCHEDULER_API_KEY in vehicle_scheduling/.env');
    error.status = 500;
    throw error;
  }

  assertTokenNotExpired(SCHEDULER_API_KEY, 'SCHEDULER_API_KEY');
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
    const detail = error.response?.data;
    const message =
      status === 401 || status === 403
        ? 'Evaluation service rejected SCHEDULER_API_KEY'
        : `Evaluation service request failed with status ${status}`;

    const serviceError: any = new Error(message);
    serviceError.status = status === 401 || status === 403 ? 502 : status;
    serviceError.detail = detail;
    return serviceError;
  }

  return error;
}

// Helper: normalize depot object to { id, mechanicHours }
function normalizeDepot(raw: any): Depot {
  const id = raw.depotId ?? raw.id ?? raw.ID ?? raw.DepotId ?? raw.DepotID;
  const mechanicHours =
    raw.MechanicHours ?? raw.mechanicHours ?? raw.mechanic_hours ?? raw.capacity ?? 8;

  return { id, mechanicHours: Number(mechanicHours) };
}

// Helper: collect tasks for a depot from vehicles
function collectTasksForDepot(depotId: any, vehicles: Vehicle[]): Task[] {
  const tasks: Task[] = [];

  vehicles.forEach((v: any) => {
    const vDepot = v.depotId ?? v.depotID ?? v.DepotId ?? v.depot ?? v.locationDepotId;
    if (vDepot !== undefined && String(vDepot) !== String(depotId)) return;

    const rawTasks = v.tasks ?? v.vehicleTasks ?? v.tasksList ?? [v];
    rawTasks.forEach((t: any, idx: number) => {
      const duration = Number(t.Duration ?? t.duration ?? t.time ?? 0);
      const impact = Number(t.Impact ?? t.impact ?? t.value ?? 0);
      const id = t.TaskID ?? t.id ?? t.taskId ?? `${v.id || 'vehicle'}-${idx}`;

      // Only include tasks with positive duration and impact
      if (!isNaN(duration) && !isNaN(impact) && duration > 0) {
        tasks.push({ id, duration, impact, meta: t });
      }
    });
  });

  return tasks;
}

// 0/1 Knapsack dynamic programming
// For simplicity we round durations to integers (hours). If durations are fractional,
// you may scale them externally (e.g., convert hours to minutes).
function knapsack(items: Task[], capacity: number) {
  const cap = Math.max(0, Math.floor(capacity));
  const n = items.length;
  // dp[i][w] = max impact using first i items with capacity w
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(cap + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    const wt = Math.min(cap, Math.max(0, Math.floor(items[i - 1].duration)));
    const val = items[i - 1].impact;
    for (let w = 0; w <= cap; w++) {
      if (wt <= w) {
        dp[i][w] = Math.max(dp[i - 1][w], dp[i - 1][w - wt] + val);
      } else {
        dp[i][w] = dp[i - 1][w];
      }
    }
  }

  // Reconstruct selected items
  let w = cap;
  const selected: Task[] = [];
  for (let i = n; i > 0; i--) {
    if (dp[i][w] !== dp[i - 1][w]) {
      const item = items[i - 1];
      selected.push(item);
      w -= Math.min(cap, Math.max(0, Math.floor(item.duration)));
    }
  }

  const totalImpact = dp[n][cap];
  const totalDuration = selected.reduce((s, it) => s + it.duration, 0);

  return { selected: selected.reverse(), totalImpact, totalDuration };
}

// Public: fetch remote data and produce schedule for all depots
export async function buildSchedules() {
  assertSchedulerConfig();

  // Build headers with Authorization if API key is provided.
  const headers = SCHEDULER_API_KEY ? { Authorization: `Bearer ${SCHEDULER_API_KEY}` } : {};

  let depRes;
  let vehRes;
  try {
    // Fetch depots and vehicles in parallel
    [depRes, vehRes] = await Promise.all([
      axios.get(DEPOTS_URL, { headers }),
      axios.get(VEHICLES_URL, { headers }),
    ]);
  } catch (error) {
    throw toServiceError(error);
  }

  const rawDepots = Array.isArray(depRes.data) ? depRes.data : depRes.data?.depots ?? depRes.data?.items ?? [];
  const rawVehicles = Array.isArray(vehRes.data) ? vehRes.data : vehRes.data?.vehicles ?? vehRes.data?.items ?? [];

  const depots = rawDepots.map(normalizeDepot);
  const vehicles = rawVehicles as Vehicle[];

  const schedules = depots.map((d: Depot) => {
    const tasks = collectTasksForDepot(d.id, vehicles as any[]);
    const { selected, totalImpact, totalDuration } = knapsack(tasks, d.mechanicHours);

    return {
      depotId: d.id,
      selectedTasks: selected.map((s) => ({ id: s.id, duration: s.duration, impact: s.impact, meta: s.meta })),
      totalDuration,
      totalImpact,
    };
  });

  return schedules;
}

export default { buildSchedules };
