import cors from 'cors';
import express from 'express';
import bodyParser from 'body-parser';
import validator from 'validator';
import { TestModel, TestComponentModel, TestLogModel } from '@advanced-rest-client/backend-models';
import logging from '@advanced-rest-client/arc-platform-logger';
import { BaseApi } from './BaseApi.js';
import background from '../lib/Background.js';

/** @typedef {import('../types').SessionRequest} Request */
/** @typedef {import('express').Response} Response */
/** @typedef {import('@advanced-rest-client/backend-models').AmfTestEntity} AmfTestEntity */
/** @typedef {import('@advanced-rest-client/backend-models').AmfTest} AmfTest */
/** @typedef {import('@advanced-rest-client/backend-models').BottomUpTestEntity} BottomUpTestEntity */
/** @typedef {import('@advanced-rest-client/backend-models').BottomUpTest} BottomUpTest */
/** @typedef {import('@advanced-rest-client/backend-models').UserEntity} UserEntity */


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
   * Validates parameters for test creation
   * @param {Request} req
   * @return {string|undefined} Error message or undefined if valid.
   */
  validateCreateTest(req) {
    const body = /** @type BottomUpTest|AmfTest */ (req.body);
    if (!body.type) {
      return 'Test "type" is required.';
    } else if (['amf', 'bottom-up'].indexOf(body.type) === -1) {
      return `"${body.type}" is not valid value for "type" property.`;
    }
    if (body.type === 'amf') {
      return this.validateAmfTest(/** @type AmfTest */ (body));
    }
    return this.validateBottomUpTest(/** @type BottomUpTest */ (body));
  }

  /**
   * @param {AmfTest} body
   * @return {string|undefined}
   */
  validateAmfTest(body) {
    const messages = [];
    if (!body.amfBranch) {
      messages[messages.length] = 'The "amfBranch" property is required.';
    }
    return messages.length ? messages.join(' ') : undefined;
  }

  /**
   * @param {BottomUpTest} body
   * @return {string|undefined}
   */
  validateBottomUpTest(body) {
    const messages = [];
    if (body.includeDev !== undefined && typeof body.includeDev !== 'boolean') {
      messages[messages.length] = `Invalid type "${typeof body.includeDev}" for "includeDev" property.`;
    }
    if (!body.repository) {
      messages[messages.length] = `The "repository" property is required.`;
    }
    return messages.length ? messages.join(' ') : undefined;
  }

  /**
   * Inserts a new test request to the data store.
   * The test is scheduled to be executed in the future.
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
      const { body, user } = req;
      let entity = /** @type AmfTest|BottomUpTest */(null);
      if (body.type === 'amf') {
        entity = this.createAmfTestObject(/** @type AmfTest */(body), user);
      } else {
        entity = this.createBottomUpTestObject(/** @type BottomUpTest */(body), user);
      }
      const id = await this.testModel.create(entity);
      res.send({ id });
      background.queueTest(id);
    } catch (cause) {
      logging.error(cause);
      const status = cause.code || 500;
      this.sendError(res, cause.message, status);
    }
  }

  /**
   * @param {AmfTest} body
   * @param {UserEntity} user
   * @return {AmfTest}
   */
  createAmfTestObject(body, user) {
    const info = /** @type AmfTest */ ({
      type: body.type,
      amfBranch: body.amfBranch,
      creator: {
        id: user.id,
        displayName: user.displayName || '',
      },
    });
    if (body.purpose) {
      info.purpose = validator.escape(body.purpose);
    }
    return info;
  }

  /**
   * @param {BottomUpTest} body
   * @param {UserEntity} user
   * @return {BottomUpTest}
   */
  createBottomUpTestObject(body, user) {
    const info = /** @type BottomUpTest */ ({
      type: body.type,
      repository: body.repository,
      creator: {
        id: user.id,
        displayName: user.displayName || '',
      },
    });
    if (body.purpose) {
      info.purpose = validator.escape(body.purpose);
    }
    return info;
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
    const { limit, pageToken } = req.query;
    const opts = {};
    if (pageToken) {
      opts.pageToken = String(pageToken);
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
        this.sendError(res, 'Invalid pageToken parameter');
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
      const resource = await this.testModel.get(testId);
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
      const resource = await this.testModel.get(testId);
      if (!resource) {
        const o = {
          message: 'Test not found',
          status: 404,
        };
        throw o;
      }
      await this.testModel.delete(testId);
      res.sendStatus(204).end();
      background.dequeueTest(testId);
    } catch (cause) {
      logging.error(cause);
      const status = cause.code || 500;
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
      background.queueTest(testId);
    } catch (cause) {
      logging.error(cause);
      const status = cause.code || 500;
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
    const { limit, pageToken } = req.query;
    const opts = {};
    if (pageToken) {
      opts.pageToken = String(pageToken);
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
        this.sendError(res, 'Invalid pageToken parameter');
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
    const { limit, pageToken } = req.query;
    const opts = {};
    if (pageToken) {
      opts.pageToken = String(pageToken);
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
        this.sendError(res, 'Invalid pageToken parameter');
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
