import express from 'express';
import bodyParser from 'body-parser';
import { BaseApi } from './BaseApi.js';
import { CoverageModel } from '@advanced-rest-client/backend-models';
import background from '../lib/Background.js';

/** @typedef {import('../types').SessionRequest} Request */
/** @typedef {import('express').Response} Response */
/** @typedef {import('@advanced-rest-client/backend-models').CoverageEntity} CoverageEntity */

const router = express.Router();
router.use(bodyParser.json());
export default router;

const allowedOrgs = [
  'advanced-rest-client',
  'api-modeling',
  'anypoint-web-components',
];

/**
 * API route definition for builds.
 */
class CoverageApi extends BaseApi {
  /**
   * @constructor
   */
  constructor() {
    super();
    this.model = new CoverageModel();
  }

  /**
   * Route to list builds.
   * @param {Request} req
   * @param {Response} res
   * @return {Promise<void>}
   */
  async scheduleCoverage(req, res) {
    try {
      await this.ensureAccess(req, 'create-coverage');
      const errors = this.validateCreateCoverage(req);
      if (errors) {
        this.sendError(res, errors, 400);
        return;
      }
      const { body, user } = req;
      const info = /** @type CoverageEntity */ ({
        component: body.component,
        org: body.org,
        tag: body.tag,
        creator: {
          id: user.id,
          displayName: user.displayName || '',
        },
      });
      if (body.branch) {
        info.branch = body.branch;
      }
      const created = await this.model.insert(info);
      res.send({ created });
      background.queueCoverageRun(created.id);
    } catch (e) {
      const status = e.code || 500;
      this.sendError(res, e.message, status);
    }
  }

  /**
   * Validates whether the coverage run schedule request is valid.
   * @param {Request} req
   * @return {string|undefined} Error message or nothing.
   */
  validateCreateCoverage(req) {
    const messages = [];
    const body = req.body;
    if (!body.org) {
      messages[messages.length] = 'The "org" property is required.';
    } else if (allowedOrgs.indexOf(body.org) === -1) {
      messages[messages.length] = `"${body.org}" is unknown for this CI.`;
    }
    if (!body.tag) {
      messages[messages.length] = 'The "tag" property is required.';
    }
    if (!body.component) {
      messages[messages.length] = 'The "component" property is required.';
    }
    return messages.length ? messages.join(' ') : undefined;
  }
}

const api = new CoverageApi();
api.setCors(router);
api.wrapApi(router, [
  ['/', 'scheduleCoverage', 'post'],
]);
