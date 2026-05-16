import axios from 'axios';

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

// Helper: normalize depot object to { id, mechanicHours }
function normalizeDepot(raw: any): Depot {
  const id = raw.depotId ?? raw.id ?? raw.DepotId ?? raw.DepotID;
  const mechanicHours =
    raw.MechanicHours ?? raw.mechanicHours ?? raw.mechanic_hours ?? raw.capacity ?? 8;

  return { id, mechanicHours: Number(mechanicHours) };
}

// Helper: collect tasks for a depot from vehicles
function collectTasksForDepot(depotId: any, vehicles: Vehicle[]): Task[] {
  const tasks: Task[] = [];

  vehicles.forEach((v: any) => {
    const vDepot = v.depotId ?? v.depotID ?? v.DepotId ?? v.depot ?? v.locationDepotId;
    if (String(vDepot) !== String(depotId)) return;

    const rawTasks = v.tasks ?? v.vehicleTasks ?? v.tasksList ?? [];
    rawTasks.forEach((t: any, idx: number) => {
      const duration = Number(t.Duration ?? t.duration ?? t.time ?? 0);
      const impact = Number(t.Impact ?? t.impact ?? t.value ?? 0);
      const id = t.id ?? t.taskId ?? `${v.id || 'vehicle'}-${idx}`;

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
  // Fetch depots and vehicles in parallel
  const [depRes, vehRes] = await Promise.all([
    axios.get(DEPOTS_URL),
    axios.get(VEHICLES_URL),
  ]);

  const rawDepots = Array.isArray(depRes.data) ? depRes.data : depRes.data?.items ?? [];
  const rawVehicles = Array.isArray(vehRes.data) ? vehRes.data : vehRes.data?.items ?? [];

  const depots = rawDepots.map(normalizeDepot);
  const vehicles = rawVehicles as Vehicle[];

  const schedules = depots.map((d) => {
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
