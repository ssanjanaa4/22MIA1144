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
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`Notification System running on port ${port}`);
});
