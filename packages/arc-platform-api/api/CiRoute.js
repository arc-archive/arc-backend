import express from 'express';
import coverageRoute from './CoverageApi.js';
import githubRoute from './GithubApi.js';
import componentsRoute from './ComponentsApi.js';
import testsRoute from './TestsApi.js';
import meRoute from './MeApi.js';
import tokenRoute from './TokenApi.js';
import groupsRoute from './GroupsApi.js';
import buildsRoute from './BuildsApi.js';

const router = express.Router();
export default router;

router.use('/tests', testsRoute);
router.use('/me', meRoute);
router.use('/tokeninfo', tokenRoute);
router.use('/github', githubRoute);
router.use('/groups', groupsRoute);
router.use('/components', componentsRoute);
router.use('/builds', buildsRoute);
router.use('/coverage', coverageRoute);

// Errors
router.use((req, res) => {
  const message = `Route ${req.url} not found`;
  res.status(404).send({
    error: true,
    message,
  });
});
