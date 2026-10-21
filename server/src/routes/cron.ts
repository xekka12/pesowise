import { Router } from 'express';
import { asyncHandler } from '../lib/http.js';
import { processDueRecurring } from '../services/recurring.js';

export const cronRouter = Router();

cronRouter.get(
  '/recurring',
  asyncHandler(async (req, res) => {
    const secret = process.env.CRON_SECRET;
    if (!secret || req.get('authorization') !== `Bearer ${secret}`) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const result = await processDueRecurring();
    res.json(result);
  }),
);
