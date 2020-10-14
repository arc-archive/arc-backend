import { verifyToken, generateToken } from '@advanced-rest-client/api-tokens';
import { TokenModel } from '@advanced-rest-client/backend-models';

/** @typedef {import('@advanced-rest-client/backend-models').UserEntity} UserEntity */

/**
 * Creates a token that has `all` scope.
 */
export async function generateFullToken() {
  const opts = {
    scopes: ['all'],
  };
  const sessionUser = /** @type UserEntity */ ({
    id: '1',
    orgUser: true,
    displayName: 'test user',
    tos: true,
    email: 'test@mulesoft.com',
  });
  const token = generateToken(sessionUser, opts);
  const info = await verifyToken(token);
  const model = new TokenModel();
  return model.create(sessionUser, info, token, 'test-all-token');
}
