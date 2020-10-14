import cors from 'cors';
import express from 'express';
import bodyParser from 'body-parser';
import crypto from 'crypto';
import config from '@advanced-rest-client/backend-config';
import { GitHubBuildModel, CoverageModel } from '@advanced-rest-client/backend-models';
import logging from '@advanced-rest-client/arc-platform-logger';
import { BaseApi } from './BaseApi.js';

/** @typedef {import('./BaseApi').SessionRequest} Request */
/** @typedef {import('express').Response} Response */

const router = express.Router();
export default router;
router.use(bodyParser.json());

/**
 * Sends 201 to GitHub request as required by GitHub webhooks API.
 * @param {Response} res
 */
function ack(res) {
  res.set('Connection', 'close');
  res.sendStatus(201);
}

/**
 * Tests whether the request is a GitHub's ping type request.
 * @param {Request} req
 * @return {Boolean} [description]
 */
function isPing(req) {
  if (req.get('X-GitHub-Event') === 'ping') {
    return true;
  }
  return false;
}

/**
 * Tests whether the push web hook is a master branch push.
 * @param {object} headers The request headers
 * @param {object} body The request body.
 * @return {Boolean} True when the push is on master branch
 */
function isMasterPush(headers, body) {
  if (headers['x-github-event'] !== 'push') {
    return false;
  }
  return body.ref === 'refs/heads/master';
}

/**
 * Tests whether the push web hook is a tag push.
 * @param {object} headers The request headers
 * @param {object} body The request body.
 * @return {Boolean} True when the push is from a tag create
 */
function isTagPush(headers, body) {
  if (headers['x-github-event'] !== 'push') {
    return false;
  }
  const ref = body.ref;
  return !!(ref && ref.indexOf('refs/tags/') === 0);
}

/**
 * Tests whether the push web hook is a master branch push.
 * @param {Request} req The request headers
 * @throws {Error} When the signature is invalid.
 */
function verifySignature(req) {
  const payload = JSON.stringify(req.body);
  if (!payload) {
    throw new Error('Request body empty');
  }

  const hmac = crypto.createHmac('sha1', config.get('WEBHOOK_SECRET'));
  const digest = `sha1=${hmac.update(payload).digest('hex')}`;
  const checksum = req.headers['x-hub-signature'];
  if (!checksum || !digest || checksum !== digest) {
    logging.warn(`Request body digest (${digest}) did not match x-hub-signature (${checksum})`);
    throw new Error('Signature is invalid');
  }
}

/**
 * Routes for GitHub webhooks.
 */
class GithubApiRoute extends BaseApi {
  /**
   * @constructor
   */
  constructor() {
    super();
    this.model = new GitHubBuildModel();
    this.coverageModel = new CoverageModel();
  }

  /**
   * Processes status request from a GitHub web hook.
   * @param {Request} req
   * @param {Response} res
   */
  processStatus(req, res) {
    try {
      verifySignature(req);
    } catch (e) {
      this.sendError(res, e.message, 400);
      return;
    }
    if (isPing(req)) {
      res.sendStatus(204);
      return;
    }
    const body = req.body;
    if (this.isStageSuccess(body)) {
      ack(res);
      this.scheduleStageBuild(body);
      return;
    }

    if (isMasterPush(req.headers, body)) {
      ack(res);
      this.scheduleMasterBuild(body);
      return;
    }

    if (isTagPush(req.headers, body)) {
      ack(res);
      this.scheduleTagBuild(body);
      return;
    }

    res.sendStatus(204);
  }

  /**
   * Tests whether the result of the stage status (github webhook api) is a success.
   * @param {object} body The request message
   * @return {Boolean} True when the status finished with a success.
   */
  isStageSuccess(body) {
    if (body.context !== 'continuous-integration/travis-ci/push') {
      return false;
    }

    if (body.state !== 'success') {
      return false;
    }

    return this.hasBranch(body, 'stage');
  }

  /**
   * Checks whether event happened on a specific branch.
   * @param {object} body The message body.
   * @param {string} name Name of the branch to search for.
   * @return {Boolean} True when the
   */
  hasBranch(body, name) {
    const branches = body.branches;
    if (!branches) {
      return false;
    }
    const branch = branches[branches.length - 1];
    if (!branch || branch.name !== name) {
      return false;
    }
    return true;
  }

  /**
   * Checks if the head commit contains `[bump-version]` phrase.
   * @param {Object} body GH payload body
   * @return {Boolean} True if the phrase exists in head commit message.
   */
  isAutoBump(body) {
    const { commit } = body;
    if (!commit) {
      return false;
    }
    const c = commit.commit;
    if (!c) {
      return false;
    }
    const { message } = c;
    if (typeof message !== 'string') {
      return false;
    }
    return message.indexOf('[bump-version]') !== -1;
  }

  /**
   * Schedules a stage build.
   * @param {object} body GitHub message.
   * @return {Promise<void>}
   */
  async scheduleStageBuild(body) {
    const sshUrl = body.repository.ssh_url;
    await this.model.insertBuild({
      type: 'stage',
      repository: sshUrl,
    });
  }

  /**
   * Schedules a master build.
   * @param {object} body GitHub message.
   * @return {Promise<void>}
   */
  async scheduleMasterBuild(body) {
    const sshUrl = body.repository.ssh_url;
    await this.model.insertBuild({
      type: 'master',
      repository: sshUrl,
    });
  }

  /**
   * Schedules a tag build.
   * @param {object} body GitHub message.
   * @return {Promise<void>}
   */
  async scheduleTagBuild(body) {
    const sshUrl = body.repository.ssh_url;
    const component = body.repository.full_name;
    const org = body.organization.login;
    const tag = body.ref.replace('refs/tags/', '');
    await this.model.insertBuild({
      type: 'tag',
      repository: sshUrl,
    });
    await this.coverageModel.insert({
      component,
      org,
      tag,
    });
  }

  /**
   * Schedules stage build for a component manually.
   * The body must contain:
   * - `sshUrl`, e.g. `git@github.com:advanced-rest-client/star-rating.git`
   * - `component`, e.g. `advanced-rest-client/star-rating`
   * - `commit`, e.g. `6b4855889c6d30cf203beddb6cf8eb42b5257609`
   *
   * This endpoint requires admin access or token with `schedule-component-build`
   * scope.
   *
   * @param {Request} req
   * @param {Response} res
   * @return {Promise<void>}
   */
  async queueStageManual(req, res) {
    try {
      const hasAccess = await this.isValidAccess(req, 'schedule-component-build');
      if (!hasAccess) {
        const o = {
          message: 'Unauthorized',
          status: 401,
        };
        throw o;
      }
      const { body } = req;
      const { sshUrl } = body;
      await this.model.insertBuild({
        type: 'stage',
        repository: sshUrl,
      });
      ack(res);
    } catch (e) {
      logging.error(e);
      // eslint-disable-next-line no-console
      console.error(e);
      const status = e.status || 500;
      this.sendError(res, e.message, status);
    }
  }

  /**
   * Schedules master build for a component manually.
   * The body must contain:
   * - `sshUrl`, e.g. `git@github.com:advanced-rest-client/star-rating.git`
   * - `component`, e.g. `advanced-rest-client/star-rating`
   * - `commit`, e.g. `220ab4f78bfd180fc7a2ad3358735d76c5fb9487`
   *
   * This endpoint requires admin access or token with `schedule-component-build`
   * scope.
   *
   * @param {Request} req
   * @param {Response} res
   * @return {Promise<void>}
   */
  async queueMasterManual(req, res) {
    try {
      const hasAccess = await this.isValidAccess(req, 'schedule-component-build');
      if (!hasAccess) {
        const o = {
          message: 'Unauthorized',
          status: 401,
        };
        throw o;
      }
      ack(res);
      const { body } = req;
      const { sshUrl } = body;
      this.model.insertBuild({
        type: 'master',
        repository: sshUrl,
      });
    } catch (e) {
      logging.error(e);
      const status = e.status || 500;
      this.sendError(res, e.message, status);
    }
  }

  /**
   * Schedules tag build for a component manually.
   * The body must contain:
   * - `sshUrl`, e.g. `git@github.com:advanced-rest-client/star-rating.git`
   * - `component`, e.g. `advanced-rest-client/star-rating`
   * - `commit`, e.g. `220ab4f78bfd180fc7a2ad3358735d76c5fb9487`
   * - `branch`, e.g. `1.0.1`
   *
   * This endpoint requires admin access or token with `schedule-component-build`
   * scope.
   *
   * @param {Request} req
   * @param {Response} res
   * @return {Promise<void>}
   */
  async queueTagManual(req, res) {
    try {
      const hasAccess = await this.isValidAccess(req, 'schedule-component-build');
      if (!hasAccess) {
        const o = {
          message: 'Unauthorized',
          status: 401,
        };
        throw o;
      }
      ack(res);
      const { body } = req;
      const { sshUrl } = body;
      this.model.insertBuild({
        type: 'tag',
        repository: sshUrl,
      });
    } catch (e) {
      logging.error(e);
      const status = e.status || 500;
      this.sendError(res, e.message, status);
    }
  }
}

const api = new GithubApiRoute();
api.setCors(router);
const checkCorsFn = api._processCors;
router.post('/status', cors(checkCorsFn), api.processStatus.bind(api));
router.post('/manual/stage', cors(checkCorsFn), api.queueStageManual.bind(api));
router.post('/manual/master', cors(checkCorsFn), api.queueMasterManual.bind(api));
router.post('/manual/tag', cors(checkCorsFn), api.queueTagManual.bind(api));
