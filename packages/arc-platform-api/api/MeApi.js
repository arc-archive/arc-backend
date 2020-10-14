import express from 'express';
import bodyParser from 'body-parser';
import { UserModel } from '@advanced-rest-client/backend-models';
import { areScopesValid, generateToken, verifyToken } from '@advanced-rest-client/api-tokens';
import validator from 'validator';
import { BaseApi } from './BaseApi.js';
import { ClientError } from './Errors.js';

/** @typedef {import('./BaseApi').SessionRequest} Request */
/** @typedef {import('express').Response} Response */
/** @typedef {import('@advanced-rest-client/backend-models').UserEntity} UserEntity */

const router = express.Router();
export default router;
router.use(bodyParser.json());

/**
 * An API to support /me route
 */
class MeApiRoute extends BaseApi {
  /**
   * @constructor
   */
  constructor() {
    super();
    this.userModel = new UserModel();
  }

  /**
   * API route to get current user
   * @param {Request} req
   * @param {Response} res
   * @return {Promise<void>}
   */
  async getCurrentUser(req, res) {
    try {
      const hasAccess = await this.isValidAccess(req);
      if (!hasAccess) {
        res.send({
          loggedIn: false,
        });
      } else {
        const sessionUser = /** @type UserEntity */ (req.user);
        const user = await this.userModel.get(sessionUser.id);
        if (!user) {
          res.send({
            loggedIn: false,
          });
        } else {
          const copy = { ...user };
          delete copy.id;
          // @ts-ignore
          copy.loggedIn = true;
          res.send(copy);
        }
      }
    } catch (e) {
      const status = e.status || 500;
      this.sendError(res, e.message, status);
    }
  }

  /**
   * API route to get current user
   * @param {Request} req
   * @param {Response} res
   * @return {Promise<void>}
   */
  async listUserTokens(req, res) {
    try {
      const hasAccess = await this.isValidAccess(req);
      if (!hasAccess) {
        const o = {
          message: 'Unauthorized',
          status: 401,
        };
        throw o;
      }
      const errors = this.validatePagination(req);
      if (errors) {
        const o = {
          message: errors,
          status: 400,
        };
        throw o;
      }
      const { limit, pageToken } = req.query;
      const opts = {};
      if (pageToken) {
        opts.pageToken = String(pageToken);
      }
      if (limit) {
        opts.limit = Number(limit);
      }
      const sessionUser = /** @type UserEntity */ (req.user);
      const result = await this.tokenModel.list(sessionUser.id, opts);
      const now = Date.now();
      result.entities.forEach((item) => {
        item.expired = item.expires <= now;
      });
      this.sendQueryResult(result, res);
    } catch (e) {
      const status = e.status || 500;
      this.sendError(res, e.message, status);
    }
  }

  /**
   * Validates token create request parameters.
   * @param {Request} req The request object
   * @throws {ClientError} when has invalid parameters
   */
  _validateTokenCreate(req) {
    const messages = [];
    const body = req.body;
    if (!body.scopes || !body.scopes.length) {
      messages[messages.length] = 'Token "scope" is required.';
    } else if (!areScopesValid(body.scopes)) {
      messages[messages.length] = `Scope "${body.scopes.join(', ')}" is invalid.`;
    }
    if (messages.length) {
      throw new ClientError(messages.join(' '));
    }
  }

  /**
   * API route to create a token
   * @param {Request} req
   * @param {Response} res
   * @return {Promise<void>}
   */
  async createUserToken(req, res) {
    try {
      await this.ensureAccess(req);
      this._validateTokenCreate(req);
      const opts = {
        scopes: req.body.scopes,
      };
      if (req.body.expiresIn) {
        opts.expiresIn = req.body.expiresIn;
      }
      const sessionUser = /** @type UserEntity */ (req.user);
      const token = generateToken(sessionUser, opts);
      const info = await verifyToken(token);
      const name = req.body.name ? validator.escape(req.body.name) : undefined;
      const result = await this.tokenModel.create(sessionUser, info, token, name);
      result.expired = false;
      res.send(result);
    } catch (cause) {
      const status = cause.status || 500;
      this.sendError(res, cause.message, status);
    }
  }

  /**
   * API route to read a token
   * @param {Request} req
   * @param {Response} res
   * @return {Promise<void>}
   */
  async getUserToken(req, res) {
    try {
      const hasAccess = await this.isValidAccess(req);
      if (!hasAccess) {
        const o = {
          message: 'Unauthorized',
          status: 401,
        };
        throw o;
      }
      const { token } = req.params;
      const sessionUser = /** @type UserEntity */ (req.user);
      const resource = await this.tokenModel.get(sessionUser.id, token);
      if (resource) {
        resource.expired = resource.expires <= Date.now();
        res.send(resource);
      } else {
        this.sendError(res, 'Token not found', 404);
      }
    } catch (cause) {
      const status = cause.status || 500;
      this.sendError(res, cause.message, status);
    }
  }

  /**
   * API route to delete a token
   * @param {Request} req
   * @param {Response} res
   * @return {Promise<void>}
   */
  async deleteUserToken(req, res) {
    try {
      const hasAccess = await this.isValidAccess(req);
      if (!hasAccess) {
        const o = {
          message: 'Unauthorized',
          status: 401,
        };
        throw o;
      }
      const { token } = req.params;
      const sessionUser = /** @type UserEntity */ (req.user);
      const resource = await this.tokenModel.get(sessionUser.id, token);
      if (resource) {
        if (resource.issuer.id !== sessionUser.id) {
          this.sendError(res, 'Token can only be deleted by its owner', 401);
          return;
        }
        await this.tokenModel.delete(sessionUser.id, token);
        res.sendStatus(204).end();
      } else {
        this.sendError(res, 'Token not found', 404);
      }
    } catch (cause) {
      const status = cause.status || 500;
      this.sendError(res, cause.message, status);
    }
  }

  /**
   * API route to revoke a token
   * @param {Request} req
   * @param {Response} res
   * @return {Promise<void>}
   */
  async revokeUserToken(req, res) {
    try {
      const hasAccess = await this.isValidAccess(req);
      if (!hasAccess) {
        const o = {
          message: 'Unauthorized',
          status: 401,
        };
        throw o;
      }
      const { token } = req.params;
      const sessionUser = /** @type UserEntity */ (req.user);
      const resource = await this.tokenModel.get(sessionUser.id, token);
      if (resource) {
        if (resource.issuer.id !== sessionUser.id) {
          this.sendError(res, 'Token can only be deleted by its owner', 401);
          return;
        }
        await this.tokenModel.revoke(sessionUser.id, token);
        res.sendStatus(204).end();
      } else {
        this.sendError(res, 'Token not found', 404);
      }
    } catch (cause) {
      const status = cause.status || 500;
      this.sendError(res, cause.message, status);
    }
  }
}

const api = new MeApiRoute();
api.setCors(router);
api.wrapApi(router, [
  ['/', 'getCurrentUser'],
  ['/tokens', 'listUserTokens'],
  ['/tokens', 'createUserToken', 'post'],
  ['/tokens/:token', 'getUserToken', 'delete'],
  ['/tokens/:token', 'deleteUserToken'],
  ['/tokens/:token/revoke', 'revokeUserToken', 'post'],
]);
