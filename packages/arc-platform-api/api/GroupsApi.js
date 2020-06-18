import express from 'express';
import bodyParser from 'body-parser';
import { ComponentModel } from '@advanced-rest-client/backend-models';
import logging from '@advanced-rest-client/arc-platform-logger';
import { BaseApi } from './BaseApi.js';

/** @typedef {import('./BaseApi').SessionRequest} Request */
/** @typedef {import('express').Response} Response */

const router = express.Router();
export default router;
router.use(bodyParser.json());

/**
 * A route responsible for Component groups.
 */
class GroupsApiRoute extends BaseApi {
  /**
   * @constructor
   */
  constructor() {
    super();
    this.model = new ComponentModel();
  }

  /**
   * Lists groups route.
   * @param {Request} req Request object.
   * @param {Response} res Response object
   * @return {Promise<void>}
   */
  async listGroups(req, res) {
    const errors = this.validatePagination(req);
    if (errors) {
      this.sendError(res, errors);
      return;
    }
    const { limit, nextPageToken } = req.query;
    const opts = {};
    if (limit) {
      opts.limit = Number(limit);
    }
    if (nextPageToken) {
      opts.pageToken = String(nextPageToken);
    }
    try {
      const result = await this.model.listGroups(opts);
      this.sendQueryResult(result, res);
    } catch (e) {
      logging.error(e.message);
      if (e.code === 3) {
        this.sendError(res, 'Inavlid nextPageToken parameter');
        return;
      }
      this.sendError(res, e.message, 500);
    }
  }

  /**
   * Get group route.
   * @param {Request} req Request object.
   * @param {Response} res Response object
   * @return {Promise<void>}
   */
  async getGroup(req, res) {
    const { groupId } = req.params;
    try {
      const resource = await this.model.getGroup(groupId);
      if (resource) {
        res.send(resource);
      } else {
        this.sendError(res, 'Group not found', 404);
      }
    } catch (e) {
      logging.error(e.message);
      this.sendError(res, e.message, 500);
    }
  }

  /**
   * Get components in a group route.
   * @param {Request} req Request object.
   * @param {Response} res Response object
   * @return {Promise<void>}
   */
  async listGroupComponents(req, res) {
    const errors = this.validatePagination(req);
    if (errors) {
      this.sendError(res, errors);
      return;
    }
    const { limit, nextPageToken } = req.query;
    const { groupId } = req.params;
    const opts = {
      group: groupId,
    };
    if (limit) {
      opts.limit = Number(limit);
    }
    if (nextPageToken) {
      opts.pageToken = String(nextPageToken);
    }
    try {
      const result = await this.model.listComponents(opts);
      this.sendQueryResult(result, res);
    } catch (e) {
      logging.error(e.message);
      if (e.code === 3) {
        this.sendError(res, 'Inavlid nextPageToken parameter');
        return;
      }
      this.sendError(res, e.message, 500);
    }
  }

  /**
   * Get component route.
   * @param {Request} req Request object.
   * @param {Response} res Response object
   * @return {Promise<void>}
   */
  async getComponent(req, res) {
    const { groupId, componentId } = req.params;
    try {
      const resource = await this.model.getComponent(groupId, componentId);
      if (resource) {
        res.send(resource);
      } else {
        this.sendError(res, 'Group not found', 404);
      }
    } catch (e) {
      logging.error(e.message);
      this.sendError(res, e.message, 500);
    }
  }

  /**
   * Get component versions route.
   * @param {Request} req Request object.
   * @param {Response} res Response object
   * @return {Promise<void>}
   */
  async listComponentVersions(req, res) {
    const errors = this.validatePagination(req);
    if (errors) {
      this.sendError(res, errors);
      return;
    }
    const { limit, nextPageToken } = req.query;
    const { groupId, componentId } = req.params;
    const opts = {};
    if (limit) {
      opts.limit = Number(limit);
    }
    if (nextPageToken) {
      opts.pageToken = String(nextPageToken);
    }
    try {
      const result = await this.model.listVersions(groupId, componentId, opts);
      this.sendQueryResult(result, res);
    } catch (e) {
      logging.error(e.message);
      if (e.code === 3) {
        this.sendError(res, 'Inavlid nextPageToken parameter');
        return;
      }
      this.sendError(res, e.message, 500);
    }
  }

  /**
   * Get component version route.
   * @param {Request} req Request object.
   * @param {Response} res Response object
   * @return {Promise<void>}
   */
  async getVersion(req, res) {
    const { groupId, componentId, versionId } = req.params;
    try {
      const resource = await this.model.getVersion(groupId, componentId, versionId);
      if (resource) {
        res.send(resource);
      } else {
        this.sendError(res, 'Group not found', 404);
      }
    } catch (e) {
      logging.error(e.message);
      this.sendError(res, e.message, 500);
    }
  }
}

const api = new GroupsApiRoute();
api.setCors(router);
api.wrapApi(router, [
  ['/', 'listGroups'],
  ['/:groupId', 'getGroup'],
  ['/:groupId/components', 'listGroupComponents'],
  ['/:groupId/components/:componentId', 'getComponent'],
  ['/:groupId/components/:componentId/versions', 'listComponentVersions'],
  ['/:groupId/components/:componentId/versions/:versionId', 'getVersion'],
]);
