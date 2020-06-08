import { UserEntity } from '@advanced-rest-client/backend-models';

/**
 * List of supported in the ARC API platform scopes.
 */
export declare const scopes: string[];

export declare interface TokenCreateInfo {
  /**
   * List of scopes
   */
  scopes: string[];
  /**
   * Describes when the token expires.
   */
  expiresIn?: string;
}

/**
 * Generates a new JWT.
 * @param user Session user object
 * @param createInfo Create options
 * @return Generated token.
 */
export declare function generateToken(user: UserEntity, createInfo: TokenCreateInfo): string;

/**
 * Veryfies whether the token is valid for the session.
 * @param token User token.
 * @returns Token info object.
 */
export declare function verifyToken(token: string): Promise<object>;

/**
 * Synchronously validates the token
 * @param token User token.
 * @returns Token info object.
 */
export function verifyTokenSync(token: string): object;

/**
 * Checks whether the token has required scope.
 * @param token Token info object
 * @param required A scope that should be in the list of scopes.
 * @returns True when the `required` scope is in the list of scopes.
 */
export function hasScope(token: object, required: string): boolean;

/**
 * Checks whether the given scope is a valid in the ARC API platform scope.
 * @param scope Scope to test
 * @returns True if the scope is one of the supported scopes.
 */
export function isValidScope(scope: string): boolean;

/**
 * Checks whether the given scopes are valid in the ARC API platform scope.
 * @param userScopes Scopes to test
 * @returns True if all scopes is one of the supported scopes.
 */
export function areScopesValid(userScopes: string[]): boolean;

/**
 * Checks whether a token expired.
 * @param token Token info object
 * @returns True when token is expired.
 */
export function isTokenExpired(token: object): boolean;
