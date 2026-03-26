import express from 'express';
import { createBirdJob, getBird } from './birdService.js';
import { getQueue } from './db.js';

const app = express();
const port = 3200;

app.use(express.json());

app.post('/bird', async (req, res) => {
  const { name } = req.body as { name?: string };
  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const job = await createBirdJob(name);
  res.status(202).json(job);
});

app.get('/bird', (req, res) => {
  const name = req.query['name'] as string | undefined;
  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const result = getBird(name);
  if (!result) {
    res.status(404).json({ error: 'No result found for this bird' });
    return;
  }

  res.json(result);
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', queueDepth: getQueue().length, ts: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
