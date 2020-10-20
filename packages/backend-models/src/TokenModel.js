import { BaseModel } from './BaseModel.js';
import uuidV4 from '@advanced-rest-client/uuid-generator/src/v4.js';

/** @typedef {import('./TokenModel').TokenEntity} TokenEntity */
/** @typedef {import('@google-cloud/datastore/build/src/entity').entity.Key} Key */
/** @typedef {import('./TokenModel').TokenQueryResult} TokenQueryResult */
/** @typedef {import('./TokenModel').TokenQueryOptions} TokenQueryOptions */
/** @typedef {import('./UserModel').UserEntity} UserEntity */
/** @typedef {import('./TokenModel').TokenInfo} TokenInfo */

/**
 * A model representing user created authentication model
 */
export class TokenModel extends BaseModel {
  /**
   * @constructor
   */
  constructor() {
    super('api-components-users');
  }

  /**
   * @return {string[]} Model properties excluded from indexes
   */
  get excludedIndexesToken() {
    return ['name', 'expires', 'issuer', 'scopes', 'revoked'];
  }

  /**
   * Creates new user token.
   * @param {UserEntity} user Session user
   * @param {TokenInfo} tokenInfo Decrypted token info
   * @param {string} token The token
   * @param {string=} name Optional name for the token
   * @return {Promise<TokenEntity>} Promise resolved to the token object.
   */
  async create(user, tokenInfo, token, name) {
    const id = uuidV4();
    const key = this.createUserTokenKey(user.id, id);

    const results = [
      {
        name: 'token',
        value: token,
        excludeFromIndexes: false,
      },
      {
        name: 'scopes',
        value: tokenInfo.scopes,
        excludeFromIndexes: true,
      },
      {
        name: 'issuer',
        value: {
          id: user.id,
          displayName: user.displayName || '',
        },
        excludeFromIndexes: true,
      },
      {
        name: 'created',
        value: Date.now(),
        excludeFromIndexes: false,
      },
      {
        name: 'revoked',
        value: false,
        excludeFromIndexes: false,
      },
    ];
    if (tokenInfo.exp) {
      results[results.length] = {
        name: 'expires',
        value: tokenInfo.exp * 1000,
        excludeFromIndexes: true,
      };
    }
    if (name) {
      results[results.length] = {
        name: 'name',
        value: name,
        excludeFromIndexes: true,
      };
    }
    const entity = {
      key,
      data: results,
    };
    await this.store.upsert(entity);
    return this.get(user.id, id);
  }

  /**
   * Finds a token in the data store.
   * @param {string} token token
   * @return {Promise<TokenEntity|null>} Promise resolved to the token or `null` if the
   * token is not in the data store.
   */
  async find(token) {
    let query = this.store.createQuery(this.namespace, this.tokenKind);
    query = query.filter('token', '=', token);
    query = query.limit(1);
    const [found] = await this.store.runQuery(query);
    if (found && found.length) {
      return this.fromDatastore(found[0]);
    }
    return null;
  }

  /**
   * Lists all user generated tokens.
   * @param {string} userId User id
   * @param {TokenQueryOptions=} opts Query options
   * @return {Promise<TokenQueryResult>} Promise resolved to an array where first item is the
   * list of results and second is either `nextPageToken` or false.
   */
  async list(userId, opts={}) {
    const { limit=this.listLimit, pageToken } = opts;
    const ancestorKey = this.createUserKey(userId);
    let query = this.store.createQuery(this.namespace, this.tokenKind).hasAncestor(ancestorKey);
    query = query.limit(limit);
    query = query.order('created', {
      descending: true,
    });
    if (pageToken) {
      query = query.start(pageToken);
    }
    const [entitiesRaw, queryInfo] = await this.store.runQuery(query);
    const entities = entitiesRaw.map(this.fromDatastore.bind(this));
    const newPageToken = queryInfo.moreResults !== this.NO_MORE_RESULTS ? queryInfo.endCursor : undefined;
    return {
      entities,
      pageToken: newPageToken,
    };
  }

  /**
   * Lookups and returns user token
   * @param {string} userId Owner id
   * @param {string} tokenId Token id
   * @return {Promise<TokenEntity|null>} A promise resolved to the token value or undefined.
   */
  async get(userId, tokenId) {
    const key = this.createUserTokenKey(userId, tokenId);
    const [entity] = await this.store.get(key);
    if (entity) {
      return this.fromDatastore(entity);
    }
    return null;
  }

  /**
   * Sets `revoked` status on a token.
   * @param {string} userId Owner id
   * @param {string} tokenId Token id
   * @return {Promise<void>}
   */
  async revoke(userId, tokenId) {
    const transaction = this.store.transaction();
    const key = this.createUserTokenKey(userId, tokenId);
    try {
      await transaction.run();
      const [token] = await transaction.get(key);
      token.revoked = true;
      transaction.save({
        key,
        data: token,
        excludeFromIndexes: this.excludedIndexesToken,
      });
      await transaction.commit();
    } catch (e) {
      transaction.rollback();
      throw e;
    }
  }

  /**
   * Removes a token from the data store
   * @param {string} userId
   * @param {string} tokenId
   * @return {Promise<void>}
   */
  async delete(userId, tokenId) {
    const key = this.createUserTokenKey(userId, tokenId);
    await this.store.delete(key);
  }
}
