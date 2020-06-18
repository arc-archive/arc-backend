import express from 'express';
import bodyParser from 'body-parser';
import { BaseApi } from './BaseApi.js';
import { MessageModel } from '@advanced-rest-client/backend-models';

/** @typedef {import('./BaseApi').SessionRequest} Request */
/** @typedef {import('express').Response} Response */
/** @typedef {import('@advanced-rest-client/backend-models').MessageFilter} MessageFilter */

const router = express.Router();
export default router;
router.use(bodyParser.json());

/**
 * A route responsible for ARC in-app messages API.
 */
class MessagesApiRoute extends BaseApi {
  /**
   * @constructor
   */
  constructor() {
    super();
    this.model = new MessageModel();
  }

  /**
   * Validates query parameters.
   * @param {Request} req The request object
   * @return {string|undefined} Error message or undefined if valid.
   */
  validatePagination(req) {
    const info = super.validatePagination(req);
    let messages;
    if (info) {
      messages = [info];
    } else {
      messages = [];
    }
    let { nextPageToken, since, until } = req.query;
    if (!nextPageToken) {
      const typedUntil = Number(until);
      const typedSince = Number(since);
      if (until) {
        if (Number.isNaN(typedUntil)) {
          messages.push('The "until" parameter is not a number.');
          until = undefined;
        }
      }
      if (since) {
        if (Number.isNaN(typedSince)) {
          messages.push('The "since" parameter is not a number.');
          since = undefined;
        }
      }
      if (since && until && since > until) {
        messages.push('"since" cannot be higher than until.');
      }
      const now = Date.now();
      if (typedSince && typedSince > now) {
        messages.push('"since" cannot be timestamp in the future.');
      }
      if (typedUntil && typedUntil > now) {
        messages.push('"until" cannot be timestamp in the future.');
      }
    }
    return messages.length ? messages.join(' ') : undefined;
  }

  /**
   * Collectes typed query parameters.
   * @param {Request} req The request object
   * @return {MessageFilter} Query options
   */
  collectQueryParameters(req) {
    const result = {};
    const { nextPageToken, since, until, target, channel, limit } = req.query;
    if (nextPageToken) {
      result.pageToken = String(nextPageToken);
    } else {
      if (since) {
        result.since = Number(since);
      }
      if (until) {
        result.until = Number(until);
      }
      if (target) {
        result.target = String(target);
      }
      if (channel) {
        result.channel = String(channel);
      }
    }
    if (limit) {
      result.limit = Number(limit);
    }
    return result;
  }

  /**
   * Validates request to create ARC in-app message.
   * @param {Request} req The request object
   * @return {string|undefined} Error message or undefined if valid.
   */
  validateCreateMessage(req) {
    const { abstract, title, actionUrl, cta, target, channel } = req.body;
    const messages = [];

    if (!abstract) {
      messages.push('The "abstract" property is required.');
    } else if (typeof abstract !== 'string') {
      messages.push('The "abstract" property has invalid type.');
    }
    if (!title) {
      messages.push('The "title" property is required.');
    } else if (typeof title !== 'string') {
      messages.push('The "title" property has invalid type.');
    }
    if (actionUrl && !cta) {
      messages.push('The "cta" property is required when "actionUrl" is set.');
    }
    if (!actionUrl && cta) {
      messages.push('The "actionUrl" property is required when "cta" is set.');
    }
    if (actionUrl && typeof actionUrl !== 'string') {
      messages.push('The "actionUrl" property has invalid type.');
    }
    if (cta && typeof cta !== 'string') {
      messages.push('The "cta" property has invalid type.');
    }
    if (channel && typeof channel !== 'string') {
      messages.push('The "channel" property has invalid type.');
    }
    if (target && !(target instanceof Array)) {
      messages.push('The "target" property has to be an array.');
    } else if (target && target instanceof Array) {
      target.forEach((item) => {
        if (typeof item !== 'string') {
          messages.push(`Target value ${item} is not a string.`);
        }
      });
    }
    return messages.length ? messages.join(' ') : undefined;
  }

  /**
   * List messages route
   * @param {Request} req The request object
   * @param {Response} res The response object
   * @return {Promise<void>}
   */
  async listMessages(req, res) {
    const errors = this.validatePagination(req);
    if (errors) {
      this.sendError(res, errors);
      return;
    }
    const params = this.collectQueryParameters(req);
    try {
      const result = await this.model.list(params);
      result.entities.forEach((i) => {
        i.kind = 'ArcInfo#Message';
      });
      this.sendQueryResult(result, res);
    } catch (e) {
      if (e.code === 3) {
        this.sendError(res, 'Inavlid nextPageToken parameter');
        return;
      }
      this.sendError(res, e.message, 500);
    }
  }

  /**
   * Create a new message route
   * @param {Request} req The request object
   * @param {Response} res The response object
   * @return {Promise<void>}
   */
  async createMesage(req, res) {
    try {
      const hasAccess = await this.isValidAccess(req, 'create-message');
      if (!hasAccess) {
        const o = {
          message: 'Unauthorized',
          status: 401,
        };
        throw o;
      }

      const errors = this.validateCreateMessage(req);
      if (errors) {
        const o = {
          message: errors,
          status: 400,
        };
        throw o;
      }

      const { body } = req;
      const info = {
        abstract: String(body.abstract),
        title: String(body.title),
      };
      if (body.actionUrl) {
        info.actionUrl = String(body.actionUrl);
      }
      if (body.cta) {
        info.cta = body.cta;
      }
      if (body.target && body.target.length) {
        info.target = body.target;
      }
      if (body.channel) {
        info.channel = body.channel;
      }
      const message = await this.model.insert(info);
      message.kind = 'ArcInfo#Message';
      res.send(message);
    } catch (e) {
      const status = e.status || 500;
      this.sendError(res, e.message, status);
    }
  }

  /**
   * Delete message route
   * @param {Request} req The request object
   * @param {Response} res The response object
   * @return {Promise<void>}
   */
  async deleteMessage(req, res) {
    const { messageId } = req.params;
    try {
      const hasAccess = await this.isValidAccess(req, 'delete-message');
      if (!hasAccess) {
        const o = {
          message: 'Unauthorized',
          status: 401,
        };
        throw o;
      }

      const resource = await this.model.get(messageId);
      if (!resource) {
        const o = {
          message: 'Message not found',
          status: 404,
        };
        throw o;
      }
      await this.model.delete(messageId);
      res.sendStatus(204).end();
    } catch (e) {
      const status = e.status || 500;
      this.sendError(res, e.message, status);
    }
  }
}
const api = new MessagesApiRoute();
api.setCors(router);
api.wrapApi(router, [
  ['/', 'listMessages'],
  ['/', 'createMesage', 'post'],
  ['/:messageId', 'deleteMessage', 'delete'],
]);
