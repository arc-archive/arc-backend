import express from 'express';
import messagesRoute from './MessagesApi.js';
import analyticsRoute from './AnalyticsApi.js';

const router = express.Router();
export default router;

router.use('/messages', messagesRoute);
router.use('/analytics', analyticsRoute);

// Errors
router.use((req, res) => {
  const message = `Route ${req.url} not found`;
  res.status(404).send({
    error: true,
    message,
  });
});
