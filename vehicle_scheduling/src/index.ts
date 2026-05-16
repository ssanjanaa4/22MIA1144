import express from 'express';
import scheduleRouter from './routes/schedule';

const app = express();

app.use(express.json());
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    // eslint-disable-next-line no-console
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Mount the schedule route at /schedule
app.use('/schedule', scheduleRouter);

// Fallback health check
app.get('/', (req, res) => res.json({ status: 'ok' }));

// Error handling middleware (must be last)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const status = err.status || 500;
  // eslint-disable-next-line no-console
  console.error(`${req.method} ${req.originalUrl} - ${err.message || 'Internal Server Error'}`);

  res.status(status).json({
    error: err.message || 'Internal Server Error',
    ...(err.detail ? { detail: err.detail } : {}),
  });
});

const port = process.env.PORT || 3000;
app.listen(Number(port), () => {
  // eslint-disable-next-line no-console
  console.log(`Vehicle Scheduling service listening on port ${port}`);
});
