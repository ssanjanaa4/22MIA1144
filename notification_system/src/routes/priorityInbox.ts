import express from 'express';
import { getTopUnreadNotifications } from '../services/priorityInboxService';

const router = express.Router();

// GET /priority-inbox
// Returns the top 10 unread notifications sorted by priority.
router.get('/', async (req, res, next) => {
  try {
    const notifications = await getTopUnreadNotifications();
    res.json({ notifications });
  } catch (error) {
    next(error);
  }
});

export default router;
