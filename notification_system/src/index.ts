import express from 'express';
import priorityInboxRouter from './routes/priorityInbox';

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

// Priority inbox endpoint
app.use('/priority-inbox', priorityInboxRouter);

// Simple health check route
app.get('/', (req, res) => {
  res.json({ status: 'notification system running' });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
    ...(err.detail ? { detail: err.detail } : {}),
  });
});

app.listen(port, () => {
  console.log(`Notification System running on port ${port}`);
});
