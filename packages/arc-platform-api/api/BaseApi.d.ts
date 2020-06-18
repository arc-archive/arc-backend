import { TokenModel } from '@advanced-rest-client/backend-models';
import { Response, Request, Router } from 'express';
import { UserEntity } from '@advanced-rest-client/backend-models';

export declare interface SessionRequest extends Request {
  user?: UserEntity;
}


export declare interface QueryResult<T> {
  /**
   * The list of entities to send with the response
   */
  entities: T[];
  /**
   * The page token used in pagination
   */
  pageToken?: string;
}

/**
 * Base for all API routes
 */
export declare class BaseApi {
  /**
   * Instance of TokenModel
   */
  readonly tokenModel: TokenModel;

  constructor();

  /**
   * Sets CORS on all routes for `OPTIONS` HTTP method.
   * @param router Express app.
   */
  setCors(router: Router): void;

  /**
   * Shorthand function to register a route on this class.
   * @param router Express app.
   * @param routes List of routes. Each route is an array
   * where:
   * - index `0` is the API route, eg, `/api/models/:modelId`
   * - index `1` is the function name to call
   * - index `2` is optional and describes HTTP method. Defaults to 'get'.
   * It must be lowercase.
   */
  wrapApi(router: Router, routes: Array<string[]>): void;

  /**
   * Sends error to the client in a standarized way.
   * @param res HTTP response object
   * @param message Error message to send.
   * @param status HTTP status code, default to 400.
   */
  sendError(res: Response, message: string, status?: number): void;

  /**
   * Tests whether the request has user session that is admin / org user or has
   * authorization header with valid JWT.
   */
  isValidAccess(req: Request, scope?: string): Promise<boolean>;

  /**
   * Ensures that the current user has access to the resource or throws an error
   * otherwise.
   * @returns Resolves when has access, rejects when do not have access.
   */
   ensureAccess(req: Request, scope?: string): Promise<void>;

  /**
   * CORS request middleaware.
   */
  _processCors(req: Request, callback: Function): void;

  /**
   * Sends response as a list response.
   * @param result Response from the data model.
   * @param res HTTP resposne
   */
  sendListResult<T>(result: T[], res: Response): void;

  /**
   * Sends query results data in response.
   * @param data
   * @param res HTTP resposne
   */
  sendQueryResult<T>(data: QueryResult<T>, res: Response): void;

  /**
   * Validates pagination parameters for variuos endpoints that result with list of results.
   * @param req HTTP request
   * @returns Validation oerr message or undefined if valid.
   */
  validatePagination(req: Request): string|undefined;
}
