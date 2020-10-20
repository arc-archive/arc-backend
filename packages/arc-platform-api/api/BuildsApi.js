import express from 'express';
import { GitHubBuildModel } from '@advanced-rest-client/backend-models';
import logging from '@advanced-rest-client/arc-platform-logger';
import background from '../lib/Background.js';
import { BaseApi } from './BaseApi.js';

/** @typedef {import('../types').SessionRequest} Request */
/** @typedef {import('express').Response} Response */

const router = express.Router();
export default router;

/**
 * API route definition for builds.
 */
class BuildsApiRoute extends BaseApi {
  /**
   * Route to list builds.
   * @param {Request} req
   * @param {Response} res
   * @return {Promise<void>}
   */
  async listBuilds(req, res) {
    const errors = this.validatePagination(req);
    if (errors) {
      this.sendError(res, errors);
      return;
    }
    const { limit, pageToken } = req.query;
    let typedLimit;
    if (limit) {
      typedLimit = Number(limit);
    }
    let typedToken;
    if (pageToken) {
      typedToken = String(pageToken);
    }
    try {
      const model = new GitHubBuildModel();
      const result = await model.list({
        limit: typedLimit,
        pageToken: typedToken,
      });
      this.sendQueryResult(result, res);
    } catch (cause) {
      logging.error(cause);
      if (cause.code === 3) {
        this.sendError(res, 'Invalid pageToken parameter');
        return;
      }
      this.sendError(res, cause.message, 500);
    }
  }

  /**
   * Route to get a build info.
   * @param {Request} req
   * @param {Response} res
   * @return {Promise<void>}
   */
  async getBuild(req, res) {
    const { id } = req.params;
    try {
      const model = new GitHubBuildModel();
      const resource = await model.get(id);
      if (resource) {
        res.send(resource);
      } else {
        this.sendError(res, 'Build not found', 404);
      }
    } catch (cause) {
      logging.error(cause);
      this.sendError(res, cause.message, 500);
    }
  }

  /**
   * Route to restart a build.
   * @param {Request} req
   * @param {Response} res
   * @return {Promise<void>}
   */
  async restartBuild(req, res) {
    const { id } = req.params;
    try {
      await this.ensureAccess(req, 'restart-build');
      const model = new GitHubBuildModel();
      await model.restartBuild(id);
      background.queueStageBuild(id);
      res.sendStatus(201).end();
    } catch (cause) {
      // logging.error(cause);
      const status = cause.code || 500;
      this.sendError(res, cause.message, status);
    }
  }
}

const api = new BuildsApiRoute();
api.setCors(router);
api.wrapApi(router, [
  ['/', 'listBuilds'],
  ['/:id', 'getBuild'],
  ['/:id/restart', 'restartBuild', 'put'],
]);
