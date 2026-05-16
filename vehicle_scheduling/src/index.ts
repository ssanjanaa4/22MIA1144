import express from 'express';
import scheduleRouter from './routes/schedule';
import { requestLogger } from '../../shared/logger/logger';
import errorHandler from '../../shared/middleware/errorHandler';

const app = express();

app.use(express.json());
app.use(requestLogger);

// Mount the schedule route at /schedule
app.use('/schedule', scheduleRouter);

// Fallback health check
app.get('/', (req, res) => res.json({ status: 'ok' }));

// Error handling middleware (must be last)
app.use(errorHandler);

const port = process.env.PORT || 3000;
app.listen(Number(port), () => {
  // eslint-disable-next-line no-console
  console.log(`Vehicle Scheduling service listening on port ${port}`);
});
