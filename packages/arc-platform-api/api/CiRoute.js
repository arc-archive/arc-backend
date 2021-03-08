import express from 'express';
import coverageRoute from './CoverageApi.js';
import componentsRoute from './ComponentsApi.js';
import testsRoute from './TestsApi.js';
import meRoute from './MeApi.js';
import tokenRoute from './TokenApi.js';

const router = express.Router();
export default router;

router.use('/tests', testsRoute);
router.use('/me', meRoute);
router.use('/tokeninfo', tokenRoute);
router.use('/components', componentsRoute);
router.use('/coverage', coverageRoute);

// Errors
router.use((req, res) => {
  const message = `Route ${req.url} not found`;
  res.status(404).send({
    error: true,
    message,
  });
});
