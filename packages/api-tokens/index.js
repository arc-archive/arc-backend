import jwt from 'jsonwebtoken';
import config from '@advanced-rest-client/backend-config';

/** @typedef {import('@advanced-rest-client/backend-models').UserEntity} UserEntity */
/** @typedef {import('./index').TokenCreateInfo} TokenCreateInfo */
/** @typedef {import('./index').TokenInfo} TokenInfo */

export const defaultScopes = [
  'all',
  'create-test',
  'delete-test',
  'create-message',
  'delete-message',
  'schedule-component-build',
];
const tokenIssuer = 'urn:arc-ci';

/**
 * Generates a new JWT.
 * @param {UserEntity} user Session user object
 * @param {TokenCreateInfo} createInfo Create options
 * @return {string} Generated token.
 */
export function generateToken(user, createInfo) {
  const secret = config.get('SECRET');
  const data = {
    uid: user.id,
    scopes: createInfo.scopes,
  };
  const opts = {
    issuer: tokenIssuer,
  };
  if (createInfo.expires) {
    opts.expiresIn = createInfo.expires;
  }
  return jwt.sign(data, secret, opts);
}

/**
 * Veryfies whether the token is valid for the session.
 * @param {string} token User token.
 * @return {Promise<TokenInfo>} Token info object.
 */
export function verifyToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, config.get('SECRET'), (err, decoded) => {
      if (err) {
        let msg;
        switch (err.message) {
          case 'invalid audience':
            msg = 'Token audinece is invalid';
            break;
          case 'invalid issuer':
            msg = 'Token issuer (source) is invalid';
            break;
          case 'jwt expired':
            msg = `Token expored at ${err.expiredAt}`;
            break;
          case 'jwt signature is required':
          case 'invalid signature':
            msg = 'Singature is invalid';
            break;
          case 'jwt malformed':
            msg = 'Malformed token';
            break;
          case 'invalid jwt id':
          case 'invalid subject':
            msg = 'Token is invalid';
            break;
          default:
            msg = 'Unknown token error';
        }
        reject(new Error(msg));
      } else if (!decoded) {
        reject(new Error('Token is invalid'));
      } else {
        resolve(decoded);
      }
    });
  });
}

/**
 * Synchronously validates the token
 * @param {string} token User token.
 * @return {TokenInfo} Token info object.
 */
export function verifyTokenSync(token) {
  return /** @type TokenInfo */ (jwt.verify(token, config.get('SECRET')));
}

/**
 * Checks whether the token has required scope.
 * @param {object} token Token info object
 * @param {string} required A scope that should be in the list of scopes.
 * @return {boolean} True when the `required` scope is in the list of scopes.
 */
export function hasScope(token, required) {
  const scopes = token.scopes || [];
  return scopes.indexOf(required) !== -1;
}

/**
 * Checks whether the given scope is a valid in the ARC API platform scope.
 * @param {string} scope Scope to test
 * @return {boolean} True if the scope is one of the supported scopes.
 */
export function isValidScope(scope) {
  return defaultScopes.indexOf(scope) !== -1;
}

/**
 * Checks whether the given scopes are valid in the ARC API platform scope.
 * @param {string[]} userScopes Scopes to test
 * @return {boolean} True if all scopes is one of the supported scopes.
 */
export function areScopesValid(userScopes) {
  const missing = userScopes.some((scope) => defaultScopes.indexOf(scope) === -1);
  return !missing;
}

/**
 * Checks whether a token expired.
 * @param {TokenInfo} token Token info object
 * @return {boolean} True when token is expired.
 */
export function isTokenExpired(token) {
  const now = Date.now() / 1000;
  return token.exp <= now;
}
