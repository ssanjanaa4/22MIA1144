import express from 'express';
import schedulerService from '../services/schedulerService';

const router = express.Router();

// GET /schedule
// Fetches depots and vehicles from remote APIs, computes a schedule per depot,
// and returns an array of schedule objects. Each object contains `depotId`,
// `selectedTasks`, `totalDuration`, and `totalImpact`.
router.get('/', async (req, res, next) => {
  try {
    const schedules = await schedulerService.buildSchedules();
    res.json(schedules);
  } catch (err) {
    // Forward to error handler middleware
    next(err);
  }
});

export default router;
