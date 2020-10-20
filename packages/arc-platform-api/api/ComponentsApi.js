import express from 'express';
import bodyParser from 'body-parser';
import { ComponentModel, DependencyModel } from '@advanced-rest-client/backend-models';
import logging from '@advanced-rest-client/arc-platform-logger';
import { BaseApi } from './BaseApi.js';

/** @typedef {import('../types').SessionRequest} Request */
/** @typedef {import('express').Response} Response */

const router = express.Router();
export default router;
router.use(bodyParser.json());

/**
 * A route responsible for Components API.
 */
class ComponentsApiRoute extends BaseApi {
  /**
   * @constructor
   */
  constructor() {
    super();
    this.model = new ComponentModel();
    this.dependencyModel = new DependencyModel();
  }

  /**
   * Validates parameters for `tag` query
   * @param {Request} req
   * @return {string|undefined} Error message or undefined if valid.
   */
  _validateTagParameter(req) {
    const { tags } = req.query;
    if (!tags) {
      return;
    }
    const messages = [];
    if (!Array.isArray(tags)) {
      if (typeof tags === 'string') {
        req.query.tags = [tags];
      } else {
        messages.push('The tags query parameter should be an array.');
      }
    } else {
      const typedTags = /** @type string[] */ (tags);
      const typeMismatch = typedTags.some((item) => typeof item !== 'string');
      if (typeMismatch) {
        messages.push(`Tag ${typeMismatch} is not a string.`);
      }
    }
    return messages.length ? messages.join(' ') : undefined;
  }

  /**
   * Lists components route.
   * @param {Request} req Request object.
   * @param {Response} res Response object
   * @return {Promise<void>}
   */
  async listComponents(req, res) {
    const errors = this.validatePagination(req);
    if (errors) {
      this.sendError(res, errors);
      return;
    }
    const tagError = this._validateTagParameter(req);
    if (tagError) {
      this.sendError(res, tagError);
      return;
    }
    const { limit, pageToken, tags, group } = req.query;
    try {
      const opts = {};
      const typedLimit = Number(limit);
      if (!Number.isNaN(typedLimit)) {
        opts.limit = typedLimit;
      }
      if (pageToken) {
        opts.pageToken = String(pageToken);
      }
      if (group) {
        opts.group = String(group);
      }
      if (tags) {
        opts.tags = tags;
      }
      const result = await this.model.queryComponents(opts);
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
   * Validates time range
   * @param {Request} req
   * @return {string|undefined} Error message or undefined if valid.
   */
  _validateTimeRange(req) {
    const { since, until } = req.query;
    if (!since && !until) {
      return;
    }
    const typedSince = Number(since);
    const typedUntil = Number(until);
    const messages = [];
    if (since && isNaN(typedSince)) {
      messages.push('The since query parameter must be a number.');
    }
    if (until && isNaN(typedUntil)) {
      messages.push('The until query parameter must be a number.');
    }
    if (!messages.length && since && until) {
      if (since > until) {
        messages.push('The since query parameter cannot be greater than until.');
      }
      if (until < since) {
        messages.push('The until query parameter cannot be lower than since.');
      }
    }
    return messages.length ? messages.join(' ') : undefined;
  }

  /**
   * Validates parent component parameters
   * @param {Request} req
   * @return {string|undefined} Error message or undefined if valid.
   */
  _validateParentParameters(req) {
    const { group, component } = req.query;
    if (group && !component) {
      return 'The "component" parameter is required when "group" is used';
    }
    if (!group && component) {
      return 'The "group" parameter is required when "component" is used';
    }
  }

  /**
   * Route to list versions of a component.
   * @param {Request} req
   * @param {Response} res
   * @return {Promise<void>}
   */
  async listVersions(req, res) {
    const errors = this.validatePagination(req);
    if (errors) {
      this.sendError(res, errors);
      return;
    }
    const tagError = this._validateTagParameter(req);
    if (tagError) {
      this.sendError(res, tagError);
      return;
    }
    const timeError = this._validateTimeRange(req);
    if (timeError) {
      this.sendError(res, timeError);
      return;
    }
    const groupError = this._validateParentParameters(req);
    if (groupError) {
      this.sendError(res, groupError);
      return;
    }
    const { limit, pageToken, tags, group, component, since, until } = req.query;
    const opts = {};
    if (limit) {
      opts.limit = Number(limit);
    }
    if (pageToken) {
      opts.pageToken = String(pageToken);
    }
    if (component) {
      opts.component = String(component);
    }
    if (group) {
      opts.group = String(group);
    }
    if (Array.isArray(tags)) {
      const typedTags = /** @type string[] */ (tags);
      opts.tags = typedTags;
    }
    if (since) {
      opts.since = Number(since);
    }
    if (until) {
      opts.until = Number(until);
    }
    try {
      const result = await this.model.queryVersions(opts);
      const noDocs = req.query['skip-docs'];
      if (noDocs === 'true') {
        result[0].forEach((item) => {
          delete item.docs;
        });
      }
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
   * Lists components that depends on this component.
   * @param {Request} req
   * @param {Response} res
   * @return {Promise<void>}
   */
  async listParentComponents(req, res) {
    const { devDependencies } = req.query;
    const { component } = req.params;
    let { scope } = req.params;
    if (scope[0] !== '@') {
      scope = `@${scope}`;
    }
    const dds = devDependencies === 'true';
    const componentId = `${scope}/${component}`;
    try {
      const result = await this.dependencyModel.listParentComponents(componentId, dds);
      this.sendListResult([result], res);
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
   * Lists component dependencies
   * @param {Request} req
   * @param {Response} res
   * @return {Promise<void>}
   */
  async listDependencies(req, res) {
    const { component } = req.params;
    let { scope } = req.params;
    if (scope[0] !== '@') {
      scope = `@${scope}`;
    }
    // TODO (pawel): dependency keys are created in an invalid way
    // const componentId = `${scope}/${component}`;
    const componentId = `${component}`;
    try {
      const data = await this.dependencyModel.get(componentId);
      if (data) {
        const result = [];
        if (data.dependencies) {
          data.dependencies.forEach((name) => {
            result.push({
              name,
              production: true,
            });
          });
        }
        if (data.devDependencies) {
          data.devDependencies.forEach((name) => {
            result.push({
              name,
              development: true,
            });
          });
        }
        this.sendListResult([result], res);
      } else {
        this.sendError(res, 'Component not found', 404);
      }
    } catch (cause) {
      logging.error(cause);
      if (cause.code === 3) {
        this.sendError(res, 'Invalid pageToken parameter');
        return;
      }
      this.sendError(res, cause.message, 500);
    }
  }
}

const api = new ComponentsApiRoute();
api.setCors(router);
api.wrapApi(router, [
  ['/', 'listComponents'],
  ['/versions', 'listVersions'],
  ['/:scope/:component/dependees', 'listParentComponents'],
  ['/:scope/:component/dependencies', 'listDependencies'],
]);
