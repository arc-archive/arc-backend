import cors from 'cors';
import express from 'express';
import bodyParser from 'body-parser';
import validator from 'validator';
import { TestModel, TestComponentModel, TestLogModel } from '@advanced-rest-client/backend-models';
import logging from '@advanced-rest-client/arc-platform-logger';
import { BaseApi } from './BaseApi.js';

/** @typedef {import('./BaseApi').SessionRequest} Request */
/** @typedef {import('express').Response} Response */

const router = express.Router();
export default router;
router.use(bodyParser.json());

/**
 * A route for tests.
 */
class TestApiRoute extends BaseApi {
  /**
   * @constructor
   */
  constructor() {
    super();
    this.testModel = new TestModel();
    this.testsComponentModel = new TestComponentModel();
    this.testsLogsModel = new TestLogModel();
  }

  /**
   * Validates parameteres for test creation
   * @param {Request} req
   * @return {string|undefined} Error message or undefined if valid.
   */
  validateCreateTest(req) {
    const messages = [];
    const body = req.body;
    if (!body.type) {
      messages[messages.length] = 'Test "type" is required.';
    } else if (['amf-build', 'bottom-up'].indexOf(body.type) === -1) {
      messages[messages.length] = `"${body.type}" is not valid value for "type" property.`;
    }
    if (!body.branch) {
      messages[messages.length] = 'The "branch" property is required.';
    }
    if (body.type === 'amf-build' && body.component) {
      messages[messages.length] = 'The "component" property cannot be used with "amf-build" type.';
    }
    if (body.type === 'bottom-up' && !body.component) {
      messages[messages.length] = 'The "component" property is required with "bottom-up" type.';
    }
    if (body.type === 'bottom-up' && !body.org) {
      messages[messages.length] = 'The "org" property is required with "bottom-up" type.';
    }
    if (body.includeDev !== undefined && typeof body.includeDev !== 'boolean') {
      messages[messages.length] = `Invalid type "${typeof body.includeDev}" for "includeDev" property.`;
    }
    if (body.component) {
      const cmp = String(body.component);
      if (cmp[0] !== '@') {
        messages[messages.length] = 'The "component" has no NPM scope.';
      }
    }
    if (body.commit && !validator.isHash(body.commit, 'sha1')) {
      messages[messages.length] = 'The "commit" property is not valid SHA1 hash.';
    }
    return messages.length ? messages.join(' ') : undefined;
  }

  /**
   * Inserts a new test request to the data store.
   * The test is scheduled to be executed in the duture.
   * The model informs the worker about new work using Pub/Sub system.
   * @param {Request} req
   * @param {Response} res
   * @return {Promise<void>}
   */
  async createTest(req, res) {
    try {
      await this.ensureAccess(req, 'create-test');
      const errors = this.validateCreateTest(req);
      if (errors) {
        this.sendError(res, errors, 400);
        return;
      }
      // @ts-ignore
      const { body, user } = req;
      const info = {
        branch: body.branch,
        type: body.type,
        creator: {
          id: user.id,
          displayName: user.displayName || '',
        },
      };
      if (body.purpose) {
        info.purpose = validator.escape(body.purpose);
      }
      if (body.commit) {
        info.commit = body.commit;
      }
      if (body.component) {
        info.component = body.component;
      }
      if (body.org) {
        info.org = body.org;
      }
      if (body.includeDev) {
        info.includeDev = body.includeDev;
      }
      const id = await this.testModel.insertTest(info);
      res.send({ id });
    } catch (cause) {
      logging.error(cause);
      const status = cause.status || 500;
      this.sendError(res, cause.message, status);
    }
  }

  /**
   * Lists tests for given parameters
   * @param {Request} req
   * @param {Response} res
   * @return {Promise<void>}
   */
  async listTest(req, res) {
    const errors = this.validatePagination(req);
    if (errors) {
      this.sendError(res, errors);
      return;
    }
    const { limit, nextPageToken } = req.query;
    const opts = {};
    if (nextPageToken) {
      opts.pageToken = String(nextPageToken);
    }
    if (limit) {
      opts.limit = Number(limit);
    }
    try {
      const result = await this.testModel.list(opts);
      this.sendQueryResult(result, res);
    } catch (cause) {
      logging.error(cause);
      if (cause.code === 3) {
        this.sendError(res, 'Inavlid nextPageToken parameter');
        return;
      }
      this.sendError(res, cause.message, 500);
    }
  }

  /**
   * Route to get a single test
   * @param {Request} req
   * @param {Response} res
   * @return {Promise<void>}
   */
  async getTest(req, res) {
    const { testId } = req.params;
    try {
      const resource = await this.testModel.getTest(testId);
      if (resource) {
        res.send(resource);
      } else {
        this.sendError(res, 'Test not found', 404);
      }
    } catch (cause) {
      logging.error(cause);
      this.sendError(res, cause.message, 500);
    }
  }

  /**
   * Route to delete a test
   * @param {Request} req
   * @param {Response} res
   * @return {Promise<void>}
   */
  async deleteTest(req, res) {
    const { testId } = req.params;
    try {
      await this.ensureAccess(req, 'delete-test');
      const resource = await this.testModel.getTest(testId);
      if (!resource) {
        const o = {
          message: 'Test not found',
          status: 404,
        };
        throw o;
      }
      await this.testModel.deleteTest(testId);
      res.sendStatus(204).end();
    } catch (cause) {
      logging.error(cause);
      const status = cause.status || 500;
      this.sendError(res, cause.message, status);
    }
  }

  /**
   * A route to reset test state and re-run the test.
   * @param {Request} req
   * @param {Response} res
   */
  async restartTest(req, res) {
    const { testId } = req.params;
    try {
      await this.ensureAccess(req, 'create-test');
      await this.testModel.resetTest(testId);
      res.sendStatus(204).end();
    } catch (cause) {
      logging.error(cause);
      const status = cause.status || 500;
      this.sendError(res, cause.message, status);
    }
  }

  /**
   * A route to list test result for a component
   * @param {Request} req
   * @param {Response} res
   */
  async listTestComponents(req, res) {
    const errors = this.validatePagination(req);
    if (errors) {
      this.sendError(res, errors);
      return;
    }
    const { testId } = req.params;
    const { limit, nextPageToken } = req.query;
    const opts = {};
    if (nextPageToken) {
      opts.pageToken = String(nextPageToken);
    }
    if (limit) {
      opts.limit = Number(limit);
    }
    try {
      const result = await this.testsComponentModel.list(testId, opts);
      this.sendQueryResult(result, res);
    } catch (cause) {
      logging.error(cause);
      if (cause.code === 3) {
        this.sendError(res, 'Inavlid nextPageToken parameter');
        return;
      }
      this.sendError(res, cause.message, 500);
    }
  }

  /**
   * A route to get a test result for a component
   * @param {Request} req
   * @param {Response} res
   */
  async getTestComponent(req, res) {
    const { testId, componentName } = req.params;
    try {
      const resource = await this.testsComponentModel.get(testId, componentName);
      if (resource) {
        res.send(resource);
      } else {
        this.sendError(res, 'Test component not found', 404);
      }
    } catch (cause) {
      logging.error(cause);
      this.sendError(res, cause.message, 500);
    }
  }

  /**
   * A route to list logs of a test
   * @param {Request} req
   * @param {Response} res
   */
  async listLogs(req, res) {
    const errors = this.validatePagination(req);
    if (errors) {
      this.sendError(res, errors);
      return;
    }
    const { testId, componentName } = req.params;
    const { limit, nextPageToken } = req.query;
    const opts = {};
    if (nextPageToken) {
      opts.pageToken = String(nextPageToken);
    }
    if (limit) {
      opts.limit = Number(limit);
    }

    try {
      const result = await this.testsLogsModel.list(testId, componentName, opts);
      this.sendQueryResult(result, res);
    } catch (cause) {
      logging.error(cause);
      if (cause.code === 3) {
        this.sendError(res, 'Inavlid nextPageToken parameter');
        return;
      }
      this.sendError(res, cause.message, 500);
    }
  }

  /**
   * A route to get a log of a test
   * @param {Request} req
   * @param {Response} res
   */
  async getLog(req, res) {
    const { testId, componentName, logId } = req.params;
    try {
      const resource = await this.testsLogsModel.get(testId, componentName, logId);
      if (resource) {
        res.send(resource);
      } else {
        this.sendError(res, 'Test log not found', 404);
      }
    } catch (cause) {
      logging.error(cause);
      this.sendError(res, cause.message, 500);
    }
  }
}

const api = new TestApiRoute();
api.setCors(router);
const checkCorsFn = api._processCors;
router.post('/', cors(checkCorsFn), api.createTest.bind(api));
router.get('/', cors(checkCorsFn), api.listTest.bind(api));
router.get('/:testId', cors(checkCorsFn), api.getTest.bind(api));
router.delete('/:testId', cors(checkCorsFn), api.deleteTest.bind(api));
router.put('/:testId/restart', cors(checkCorsFn), api.restartTest.bind(api));
router.get('/:testId/components', cors(checkCorsFn), api.listTestComponents.bind(api));
router.get('/:testId/components/:componentName', cors(checkCorsFn), api.getTestComponent.bind(api));
router.get('/:testId/components/:componentName/logs', cors(checkCorsFn), api.listLogs.bind(api));
router.get('/:testId/components/:componentName/logs/:logId', cors(checkCorsFn), api.getLog.bind(api));
