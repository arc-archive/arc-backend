import cors from 'cors';
import express from 'express';
import { verifyToken } from '@advanced-rest-client/api-tokens';
import { BaseApi } from './BaseApi.js';

/** @typedef {import('express').Response} Response */
/** @typedef {import('express').Request} Request */

const router = express.Router();
export default router;

/**
 * An API for API token
 */
class TokenApiRoute extends BaseApi {
  /**
   * Decodes user token.
   * @param {Request} req
   * @param {Response} res
   * @return {Promise<void>}
   */
  async processToken(req, res) {
    const { token } = req.query;
    if (!token) {
      this.sendError(res, 'Specify token to analyze.', 400);
      return;
    }
    try {
      const decoded = await verifyToken(String(token));
      const info = {
        scopes: decoded.scopes,
        expires: new Date(decoded.exp * 1000),
      };
      res.send(info);
    } catch (e) {
      this.sendError(res, e.message, 400);
    }
  }
}

const api = new TokenApiRoute();
api.setCors(router);
const checkCorsFn = api._processCors;
router.get('/', cors(checkCorsFn), api.processToken.bind(api));
